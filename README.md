# xo-server-webhook-vm-control

Control VMs via webhooks in Xen Orchestra using API tokens or cookie authentication.

## Features

- HTTP endpoints for VM control operations
- Flexible authentication options:
  - API token authentication
  - Optional XO cookie authentication
- Supports start, stop, reboot, and status operations
- Detailed logging with @xen-orchestra/log
- Comprehensive error handling with proper status codes

## Installation

Like all other xo-server plugins, it can be configured directly via the web interface, see [the plugin documentation](https://xen-orchestra.com/docs/plugins.html).

## Configuration

The plugin supports two configuration options:

1. **API Tokens**: List of tokens that are allowed to access the webhook endpoints
2. **Allow Cookie Authentication**: Enable/disable XO cookie authentication for webhook endpoints (enabled by default)

If no API tokens are configured, all token requests will be accepted (helpful during initial setup and testing).

## Endpoints

All endpoints are available under `/plugins/webhook-vm-control/`:

1. Get VM Status:

```
GET /plugins/webhook-vm-control/status?id={vmId}
```

2. Start VM:

```
GET /plugins/webhook-vm-control/start?id={vmId}
```

3. Stop VM:

```
GET /plugins/webhook-vm-control/stop?id={vmId}
```

4. Reboot VM:

```
GET /plugins/webhook-vm-control/reboot?id={vmId}
```

## Authentication

Two authentication methods are supported:

### 1. API Token Authentication

Use your configured API token in the Authorization header:

```bash
Authorization: Bearer YOUR_API_TOKEN
```

### 2. Cookie Authentication

If enabled (default), you can use your XO session cookie for authentication.

## Example Usage

Get VM Status:

```bash
curl -X GET \
  'http://your-xo-server/plugins/webhook-vm-control/status?id=your-vm-uuid' \
  -H 'Authorization: Bearer YOUR_API_TOKEN'
```

Start a VM:

```bash
curl -X GET \
  'http://your-xo-server/plugins/webhook-vm-control/start?id=your-vm-uuid' \
  -H 'Authorization: Bearer YOUR_API_TOKEN'
```

Stop a VM:

```bash
curl -X GET \
  'http://your-xo-server/plugins/webhook-vm-control/stop?id=your-vm-uuid' \
  -H 'Authorization: Bearer YOUR_API_TOKEN'
```

Reboot a VM:

```bash
curl -X GET \
  'http://your-xo-server/plugins/webhook-vm-control/reboot?id=your-vm-uuid' \
  -H 'Authorization: Bearer YOUR_API_TOKEN'
```

## Responses

### Success Responses

Status Check:

```json
{"status": "running"}  // For running VM
{"status": "stopped"}  // For stopped VM
```

Start Operation:

```json
{ "status": "running" }
```

Stop Operation:

```json
{ "status": "stopped" }
```

Reboot Operation:

```json
{ "status": "rebooting" }
```

### Error Responses

Missing VM ID:

```json
{ "error": "Missing VM ID" }
```

Invalid VM ID:

```json
{ "error": "Invalid VM ID: {vmId}" }
```

Operation Error:

```json
{ "error": "Failed to {action} VM" }
```

Authentication Error:

```
401 Unauthorized
```

## License

AGPL-3.0-or-later © [Ahkh3e](https://github.com/Ahkh3e)
