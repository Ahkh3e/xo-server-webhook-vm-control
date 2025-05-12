import { createLogger } from "@xen-orchestra/log";

const log = createLogger("xo:webhook-vm-control");

// Configuration schema to allow setting API tokens in the UI
export const configurationSchema = {
  type: "object",
  properties: {
    apiTokens: {
      type: "array",
      title: "API Tokens",
      description:
        "List of API tokens that are allowed to access the webhook endpoints",
      items: {
        type: "string",
      },
      default: [],
    },
    allowCookieAuth: {
      type: "boolean",
      title: "Allow Cookie Authentication",
      description: "Allow using XO cookie authentication for webhook endpoints",
      default: true,
    },
  },
};

class WebhookVMControl {
  constructor({ xo }) {
    this.xo = xo;
    this.apiTokens = new Set();
    this.allowCookieAuth = true;
  }

  configure(configuration) {
    if (configuration?.apiTokens?.length) {
      this.apiTokens = new Set(configuration.apiTokens);
      log.info(`configured ${this.apiTokens.size} API tokens`);
    } else {
      this.apiTokens = new Set();
      log.warning("no API tokens configured");
    }

    this.allowCookieAuth = configuration?.allowCookieAuth !== false;
    log.info(
      `cookie authentication is ${
        this.allowCookieAuth ? "enabled" : "disabled"
      }`
    );
  }

  async load() {
    log.info("loading webhook vm control plugin");

    this._unregisterHandlers = [
      this.registerEndpoint("status", this.handleStatus),
      this.registerEndpoint("start", this.handleStart),
      this.registerEndpoint("stop", this.handleStop),
      this.registerEndpoint("reboot", this.handleReboot),
    ];

    log.info("webhook vm control plugin loaded successfully");
  }

  unload() {
    log.info("unloading webhook vm control plugin");
    if (this._unregisterHandlers) {
      this._unregisterHandlers.forEach((handler) => handler());
    }
    log.info("webhook vm control plugin unloaded successfully");
  }

  // Helper method for registering endpoints with consistent path structure
  registerEndpoint(action, handler) {
    return this.xo.registerHttpRequestHandler(
      `/plugins/webhook-vm-control/${action}`,
      async (req, res) => {
        // Authentication handling
        let isAuthenticated = false;

        // Check for Bearer token authentication
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.substring(7).trim();

          if (this.apiTokens.size === 0) {
            // If no tokens are configured, allow all token requests
            // This helps during initial setup and testing
            log.warn("no API tokens configured, accepting all token requests", {
              action,
            });
            isAuthenticated = true;
          } else if (this.apiTokens.has(token)) {
            // Token exists in our configured tokens
            isAuthenticated = true;
            log.debug("authenticated via bearer token", { action });
          } else {
            // Invalid token
            log.warn("unauthorized access attempt with invalid token", {
              action,
              ip: req.connection.remoteAddress,
            });
            res.status(401).send("Unauthorized");
            return;
          }
        } else if (!this.allowCookieAuth) {
          // No bearer token and cookie auth is disabled
          log.warn("request without token and cookie auth disabled", {
            action,
            ip: req.connection.remoteAddress,
          });
          res.status(401).send("Unauthorized");
          return;
        }
        // If we reach here with no Bearer token, we'll rely on XO's cookie auth

        const { id } = req.query;
        if (!id) {
          res.status(400).json({ error: "Missing VM ID" });
          return;
        }

        try {
          const result = await handler.call(this, id);
          res.json(result);
        } catch (error) {
          const status = error.status || 409;
          const message = error.message || `Failed to ${action} VM`;
          log.error(`${action} operation failed`, {
            vmId: id,
            error: message,
            status,
          });
          res.status(status).json({ error: message });
        }
      }
    );
  }

  // VM Status handler
  async handleStatus(id) {
    log.debug("status request received", { vmId: id });

    const vm = await this.getVm(id);
    const status =
      vm.power_state?.toLowerCase() === "running" ? "running" : "stopped";

    log.info("vm status check successful", {
      vmId: id,
      vmName: vm.name_label,
      status,
    });

    return { status };
  }

  // VM Start handler
  async handleStart(id) {
    log.debug("start request received", { vmId: id });

    const vm = await this.getVm(id);

    // Check if VM is already running
    if (vm.power_state?.toLowerCase() === "running") {
      log.info("vm already running, no action needed", {
        vmId: id,
        vmName: vm.name_label,
      });
      return { status: "running" };
    }

    log.info("starting vm", { vmId: id, vmName: vm.name_label });

    try {
      const xapi = this.xo.getXapi(vm.$pool);
      await xapi.callAsync("VM.start", vm._xapiRef, false, false);

      log.info("vm started successfully", { vmId: id, vmName: vm.name_label });

      return { status: "running" };
    } catch (error) {
      // Special handling for power state errors
      if (
        error.code === "VM_BAD_POWER_STATE" &&
        error.params?.[2]?.toLowerCase() === "running"
      ) {
        log.info("vm is already running", { vmId: id, vmName: vm.name_label });
        return { status: "running" };
      }
      throw error;
    }
  }

  // VM Stop handler
  async handleStop(id) {
    log.debug("stop request received", { vmId: id });

    const vm = await this.getVm(id);

    // Check if VM is already stopped
    if (vm.power_state?.toLowerCase() === "halted") {
      log.info("vm already stopped, no action needed", {
        vmId: id,
        vmName: vm.name_label,
      });
      return { status: "stopped" };
    }

    log.info("stopping vm", { vmId: id, vmName: vm.name_label });

    try {
      const xapi = this.xo.getXapi(vm.$pool);
      // Using clean_shutdown for safer operation
      await xapi.callAsync("VM.clean_shutdown", vm._xapiRef);

      log.info("vm stopped successfully", { vmId: id, vmName: vm.name_label });

      return { status: "stopped" };
    } catch (error) {
      // Special handling for power state errors
      if (
        error.code === "VM_BAD_POWER_STATE" &&
        error.params?.[2]?.toLowerCase() === "halted"
      ) {
        log.info("vm is already halted", { vmId: id, vmName: vm.name_label });
        return { status: "stopped" };
      }
      throw error;
    }
  }

  // VM Reboot handler
  async handleReboot(id) {
    log.debug("reboot request received", { vmId: id });

    const vm = await this.getVm(id);

    // Check if VM is halted - cannot reboot a stopped VM
    if (vm.power_state?.toLowerCase() === "halted") {
      const error = new Error(
        "Cannot reboot a stopped VM. Start the VM first."
      );
      error.status = 400;
      throw error;
    }

    log.info("rebooting vm", { vmId: id, vmName: vm.name_label });

    const xapi = this.xo.getXapi(vm.$pool);
    await xapi.callAsync("VM.clean_reboot", vm._xapiRef);

    log.info("vm reboot initiated successfully", {
      vmId: id,
      vmName: vm.name_label,
    });

    return { status: "rebooting" };
  }

  // VM lookup helper
  async getVm(vmId) {
    log.debug("fetching vm details", { vmId });

    try {
      const vm = await this.xo.getObject(vmId);

      if (!vm || vm.type !== "VM") {
        const error = new Error(`Invalid VM ID: ${vmId}`);
        error.status = 404;
        throw error;
      }

      return vm;
    } catch (error) {
      // Enhance error with appropriate status code if not set
      if (!error.status) {
        error.status = error.code === "ENOENT" ? 404 : 500;
      }
      throw error;
    }
  }
}

// Export factory function
export default (opts) => new WebhookVMControl(opts);
