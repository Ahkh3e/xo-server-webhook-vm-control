# xo-server-webhook-vm-control

> Control VMs via webhooks in Xen Orchestra using API keys

## Features

- HTTP endpoint for VM control operations
- Uses XO's native API key authentication
- Supports start, stop, and restart operations
- Configurable webhook path
- Detailed logging and error handling

## Installation

Like all other xo-server plugins, it can be configured directly via the web interface, see [the plugin documentation](https://xen-orchestra.com/docs/plugins.html).

## Usage

### Authentication

Use your XO API key in the Authorization header:

```bash
Authorization: Bearer YOUR_XO_API_KEY
```

### Endpoints

1. Start VM:
```
POST /vm/{vmId}/start
```

2. Stop VM:
```
POST /vm/{vmId}/stop
Body: { "force": false }  // Optional
```

3. Get VM Status:
```
GET /vm/{vmId}/status
```

### Example Usage

Start a VM:
```bash
curl -X POST \
  https://your-xo-server/api/v1/vm/your-vm-uuid/start \
  -H 'Authorization: Bearer YOUR_XO_API_KEY'
```

Stop a VM (with force option):
```bash
curl -X POST \
  https://your-xo-server/api/v1/vm/your-vm-uuid/stop \
  -H 'Authorization: Bearer YOUR_XO_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"force": true}'
```

Check VM Status:
```bash
curl -X GET \
  https://your-xo-server/api/v1/vm/your-vm-uuid/status \
  -H 'Authorization: Bearer YOUR_XO_API_KEY'
```

### Responses

Success Responses:
```json
{"status": "running"}  // For running VM
{"status": "stopped"}  // For stopped VM
```

Error Response:
```json
{
  "status": "error",
  "message": "Error message here"
}
```

## License

AGPL-3.0-or-later © [Vates SAS](https://vates.fr)
