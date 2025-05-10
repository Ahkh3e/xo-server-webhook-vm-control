import { createLogger } from '@xen-orchestra/log'

const log = createLogger('xo:webhook-vm-control')

class WebhookVMControl {
  constructor({ xo }) {
    this._xo = xo
  }

  load() {
    // Register webhook endpoints
    const routes = [
      ['post', '/vm/:vmId/start', this.handleStart.bind(this)],
      ['post', '/vm/:vmId/stop', this.handleStop.bind(this)],
      ['get', '/vm/:vmId/status', this.handleStatus.bind(this)]
    ]

    this._unregisterWebhooks = routes.map(([method, path, handler]) =>
      this._xo.addRoute(method, path, handler)
    )
  }

  unload() {
    if (this._unregisterWebhooks) {
      this._unregisterWebhooks.forEach(unregister => unregister())
    }
  }

  async _validateAuth(req) {
    const { token } = await this._xo.authenticateUser(req)
    if (!token) {
      throw new Error('Authentication required')
    }
  }

  async _getVm(vmId) {
    const vm = await this._xo.getObject(vmId)
    if (!vm || vm.type !== 'VM') {
      throw new Error(`Invalid VM ID: ${vmId}`)
    }
    return vm
  }

  async handleStart(req, res) {
    try {
      await this._validateAuth(req)
      const { vmId } = req.params

      const vm = await this._getVm(vmId)
      await this._xo.startVm(vmId)

      log.debug('vm start successful', {
        vmId,
        userName: req.session?.user?.name
      })

      res.json({ status: 'running' })
    } catch (error) {
      log.error('vm start failed', { error: error.message })
      res.status(error.status || 500).json({ status: 'error', message: error.message })
    }
  }

  async handleStop(req, res) {
    try {
      await this._validateAuth(req)
      const { vmId } = req.params
      const { force = false } = req.body

      const vm = await this._getVm(vmId)
      await this._xo.stopVm(vmId, force)

      log.debug('vm stop successful', {
        vmId,
        userName: req.session?.user?.name
      })

      res.json({ status: 'stopped' })
    } catch (error) {
      log.error('vm stop failed', { error: error.message })
      res.status(error.status || 500).json({ status: 'error', message: error.message })
    }
  }

  async handleStatus(req, res) {
    try {
      await this._validateAuth(req)
      const { vmId } = req.params

      const vm = await this._getVm(vmId)
      const status = vm.power_state?.toLowerCase() === 'running' ? 'running' : 'stopped'

      log.debug('vm status check', {
        vmId,
        status,
        userName: req.session?.user?.name
      })

      res.json({ status })
    } catch (error) {
      log.error('vm status check failed', { error: error.message })
      res.status(error.status || 500).json({ status: 'error', message: error.message })
    }
  }
}

// Export plugin class
export default opts => new WebhookVMControl(opts)
