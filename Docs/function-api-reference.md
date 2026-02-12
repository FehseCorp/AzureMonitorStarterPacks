# Function App API Reference

The Azure Monitor Starter Packs backend runs as an Azure Function App with HTTP and Timer triggers. This document describes the request/response format for each HTTP-triggered function.

All HTTP functions use **POST** method and require the Function App host key for authentication.

---

## config

Configuration and data retrieval endpoint. Uses query parameter `Action` to select the operation.

**URL:** `https://<function-app>/api/config?Action=<action>`

| Action | Description | Additional Query Params | Response |
|--------|------------|------------------------|----------|
| `getInstanceName` | Returns the instance name | — | `{"InstanceName": "..."}` |
| `getAllServiceTags` | Returns all or filtered service tags | `Type` (optional, e.g. `PaaS`) | Array of `{tag, nameSpace, type}` |
| `getdiscoveryresults` | Returns discovery results from LAW | — | `{"Discovered": [...]}` |
| `getNonMonitoredPaaS` | Returns PaaS resources without monitoring | `resourceFilter` (optional) | `{"Non-Monitored Resources": [...]}` |
| `getMonitoredPaaS` | Returns PaaS resources with monitoring | `resourceFilter` (optional) | `{"Monitored Resources": [...]}` |
| `getSupportedServices` | Returns AMBA-supported service namespaces | — | Array of `{nameSpace}` |
| `runDiscovery` | Triggers discovery analysis | — | — |
| `getavailableIaaSPacks` | Returns available IaaS pack definitions | — | Pack content JSON |
| `getPacksDefinition` | Returns full PacksDef.json content | — | PacksDef JSON |
| `getIaaSPacksDetails` | Returns IaaS pack details | — | Pack details JSON |
| `getServicesPacksDetails` | Returns AMBA service catalog | — | AMBA catalog JSON |

**Error Responses:**
- `400 Bad Request` — Missing `Action` parameter or unknown action
- `500 Internal Server Error` — Unhandled exception during processing

---

## packmgmt

Pack management endpoint for importing packs and adding/removing monitoring from resources.

**URL:** `https://<function-app>/api/packmgmt`

### Import a Pack

```json
{
    "Action": "importPack",
    "PackDef": [
        {
            "Name": "My Pack",
            "Tag": "MyPack",
            "Description": "...",
            "OS": "Windows",
            "Rules": [...],
            "Alerts": [...]
        }
    ]
}
```

### Add Monitoring (IaaS)

```json
{
    "Action": "AddPack",
    "PackType": "Iaas",
    "Pack": "ADDS,DNS2016",
    "DefaultAG": "/subscriptions/.../actionGroups/...",
    "WorkspaceId": "/subscriptions/.../workspaces/...",
    "Resources": [
        {
            "Resource": "/subscriptions/.../virtualMachines/vm1",
            "OS": "Windows",
            "Location": "eastus",
            "Pack": "ADDS"
        }
    ]
}
```

### Add Monitoring (PaaS)

```json
{
    "Action": "AddPack",
    "PackType": "PaaS",
    "DefaultAG": "/subscriptions/.../actionGroups/...",
    "WorkspaceId": "/subscriptions/.../workspaces/...",
    "Resources": [
        {
            "Resource": "/subscriptions/.../storageAccounts/sa1",
            "type": "microsoft.storage/storageaccounts",
            "location": "eastus"
        }
    ]
}
```

### Remove Monitoring

```json
{
    "Action": "RemoveTag",
    "PackType": "Iaas",
    "Pack": "ADDS",
    "Resources": [
        {
            "Resource": "/subscriptions/.../virtualMachines/vm1"
        }
    ]
}
```

**Error Responses:**
- `400 Bad Request` — Missing `Action`, empty `Resources`, or empty `PackDef` for import
- `500 Internal Server Error` — Unhandled exception during processing

---

## agentMgmt

Azure Monitoring Agent (AMA) management endpoint.

**URL:** `https://<function-app>/api/agentMgmt`

### Add Agent

```json
{
    "Action": "AddAgent",
    "Resources": [
        {
            "id": "/subscriptions/.../virtualMachines/vm1",
            "OSType": "Windows",
            "location": "eastus"
        }
    ]
}
```

### Remove Agent

```json
{
    "Action": "RemoveAgent",
    "Resources": [
        {
            "id": "/subscriptions/.../virtualMachines/vm1",
            "OSType": "Windows",
            "location": "eastus"
        }
    ]
}
```

**Error Responses:**
- `400 Bad Request` — Missing `Action` or empty `Resources`
- `500 Internal Server Error` — Unhandled exception during processing

---

## alertConfigMgmt

Alert rule configuration endpoint for enabling, disabling, updating action groups, and deleting alerts.

**URL:** `https://<function-app>/api/alertConfigMgmt`

### Enable/Disable Alerts

```json
{
    "Action": "Enable",
    "alerts": [
        {
            "id": "/subscriptions/.../providers/Microsoft.Insights/scheduledQueryRules/AlertRule-1"
        }
    ]
}
```

### Update Action Group

```json
{
    "Action": "Update",
    "aGroup": {
        "id": "/subscriptions/.../actionGroups/myActionGroup"
    },
    "alerts": [
        {
            "id": "/subscriptions/.../providers/Microsoft.Insights/scheduledQueryRules/AlertRule-1"
        }
    ]
}
```

### Delete Alerts

```json
{
    "Action": "Delete",
    "alerts": [
        {
            "id": "/subscriptions/.../providers/Microsoft.Insights/scheduledQueryRules/AlertRule-1"
        }
    ]
}
```

**Valid Actions:** `Enable`, `Disable`, `Update`, `Delete`

**Error Responses:**
- `400 Bad Request` — Missing `Action`, empty `alerts`, or missing `aGroup.id` for Update
- `500 Internal Server Error` — Unhandled exception during processing

---

## opstasksondemand

On-demand operational tasks endpoint.

**URL:** `https://<function-app>/api/opstasksondemand`

```json
{
    "TaskNames": ["AvailablePacks", "SupportedServices"]
}
```

**Valid TaskNames:** `All`, `AvailablePacks`, `SupportedServices`, `MonitoredServices`, `UnmonitoredServices`

If `TaskNames` is omitted, all tasks are executed.

**Error Responses:**
- `500 Internal Server Error` — Unhandled exception during task execution

---

## Timer-Triggered Functions

These functions run on a schedule and have no HTTP interface.

| Function | Schedule | Description |
|----------|----------|-------------|
| `runDiscovery` | Timer | Analyzes discovery data from VMs and stores results in the LAW `ResultsDiscovery` table |
| `opstasks` | Timer | Runs background operational tasks (refreshes pack/service data in LAW custom tables) |
