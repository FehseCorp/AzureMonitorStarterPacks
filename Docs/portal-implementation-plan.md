# Azure Monitor Starter Packs - Admin Portal Implementation Plan

## 1. Executive Summary

This document details the plan to replace the current Azure Workbook-based admin centre (`extendedwb.json`, ~5200 lines) with a standalone web portal. The workbook currently manages monitoring pack lifecycle, alert rules, agent deployment, service discovery, and backend configuration for the Azure Monitor Starter Packs solution.

---

## 2. Current Workbook Capabilities Analysis

### 2.1 Tabs and Features

| Tab | Sub-tabs | Capabilities |
|-----|----------|-------------|
| **Getting Started** | — | Welcome page, instance info, links to docs |
| **Status** | Active Alerts, IaaS Summary, Services Summary, Dashboards | Read-only dashboards — pie charts, tiles, grids |
| **Servers** | Monitored / Non-Monitored | Add/remove packs on VMs/Arc machines, update packs |
| **Services** | Monitored / Non-Monitored | Add/remove monitoring for PaaS services |
| **Alert Rules** | Packs' Alerts / Other Alerts | Enable/disable/delete alerts, change action groups |
| **Packs** | Associations, DCR Details, VMInsights, Import, IaaS Details, Services Details | View DCR configs, VM Insights status, import pack JSON |
| **Agents** | Agents, HeartBeat, VM Applications | Install/remove AMA, view heartbeat, VM app inventory |
| **Discovery** | Results, Config, Data | Enable discovery, view results, parse raw data |
| **Configuration** | Resource List | Select instance, subscriptions, workspace, function, logic app, Grafana, action group, AMW |
| **Logs** | — | App Insights invocations and traces for backend functions |

### 2.2 Backend Function App Endpoints (called directly — no Logic App)

| Function Endpoint | Actions | Purpose |
|----------|---------|---------|
| `POST /api/packmgmt` | AddPack, RemoveTag, importPack | Manage monitoring pack assignments |
| `POST /api/alertConfigMgmt` | Enable, Disable, Update, Delete | Manage alert rule lifecycle |
| `POST /api/agentMgmt` | AddAgent, RemoveAgent | Install/remove Azure Monitor Agent |
| `POST /api/opstasksondemand` | TaskNames: [All], [AvailablePacks] | Refresh backend caches |
| `GET /api/config?Action=...` | getavailableIaaSPacks, getSupportedServices, getMonitoredPaaS, getNonMonitoredPaaS, getdiscoveryresults, etc. | Read-only metadata and catalog queries |

> **Note:** The workbook used a Logic App as a relay (because workbooks can only do ARM Actions). The portal calls these Function endpoints directly — no Logic App needed.

### 2.3 Data Sources

| Source | Query Type | SDK/API | Tables/Resources |
|--------|-----------|---------|-----------------|
| **Azure Resource Graph** | ARG (queryType: 1) | `@azure/arm-resourcegraph` | resources, insightsresources, alertsmanagementresources, policyresources |
| **Log Analytics Workspace** | KQL (queryType: 0) | `@azure/monitor-query` | AvailableIaaSPacks_CL, MonitoredPaaSTable_CL, NonMonitoredPaaSTable_CL, SupportedServices_CL, Discovery_CL, DiscoveryResults_CL, Heartbeat |
| **Application Insights** | KQL (queryType: 0) | `@azure/monitor-query` | requests, traces, exceptions |
| **Function App (Direct)** | Direct HTTPS with Entra token | `fetch()` | `/api/packmgmt`, `/api/alertConfigMgmt`, `/api/agentMgmt`, `/api/opstasksondemand`, `/api/config` |

### 2.4 ARG Queries Catalog (29 queries)

<details>
<summary>Click to expand full ARG query list</summary>

1. **Instance names** — `microsoft.web/sites` with `tags.MonitorStarterPacksComponents`
2. **Function apps by instance** — filtered by `tags.instanceName`
3. **Log Analytics workspaces by instance** — `tags.instanceName` match
4. **Logic apps by instance** — `microsoft.logic/workflows` with component tags
5. **Grafana instances by instance** — `microsoft.dashboard/grafana`
6. **Action groups** — `microsoft.insights/actiongroups` where enabled
7. **Azure Monitor Workspaces** — `microsoft.monitor/accounts` by instance
8. **App Insights by function name** — `microsoft.insights/components`
9. **Active alerts** — joins `alertsmanagementresources` with alert rules by instance
10. **Monitoring status** — VMs/Arc machines monitored vs not by instance
11. **Agent install status** — AMA extension presence + Arc extensions
12. **DCR association counts** — datacollectionrules + associations by pack
13. **Tagged resources per pack** — VMs by MonitorStarterPacks tag
14. **Associated servers per pack** — DCR association join
15. **PaaS alert summaries** — metric/activity log alerts by namespace
16. **Dashboards list** — workbooks + Grafana dashboards
17. **Alert packs dropdown** — distinct pack tags from alert rules
18. **Alert rules by pack** — scheduled/metric/activity log alerts
19. **Other alerts** — alert rules without pack tags
20. **Action groups with emails** — for action group selection
21. **IaaS pack associations detail** — DCR rulename to pack mapping
22. **Machines for selected DCR** — association detail drill-down
23. **DCR configuration details** — data sources, endpoints, transforms
24. **VMInsights servers** — VmInsights counter specifier match
25. **VMInsights DCR details** — per-server DCR breakdown
26. **VMInsights DCR server count** — aggregated per DCR
27. **Service type dropdown** — distinct PaaS types being monitored
28. **Discovery tagged VMs** — WinDisc/LxDisc tagged machines
29. **Non-discoverable machines** — VMs without discovery tags

</details>

### 2.5 KQL (Workspace) Queries Catalog (13 queries)

<details>
<summary>Click to expand full KQL query list</summary>

1. **AvailableIaaSPacks_CL** — pack tags for dropdowns (x2 instances)
2. **SupportedServices_CL** — service namespaces for PaaS type dropdown
3. **Heartbeat** — AMA heartbeat with last-seen time
4. **Discovery_CL** — raw discovery data parsing (CSV in RawData)
5. **DiscoveryResults_CL** — latest discovery results
6. **MonitoredPaaSTable_CL** — monitored PaaS services
7. **NonMonitoredPaaSTable_CL** — non-monitored PaaS for tagging
8. **AvailableIaaSPacks_CL** — detailed pack info (Name, Tag, rules, alerts)
9. **SupportedServices_CL** — detailed service info (category, namespace, metrics)
10. **App Insights requests** — function invocation list
11. **App Insights traces + exceptions** — invocation detail logs

</details>

### 2.6 ARM Actions Catalog (25 actions)

All actions call the Function App directly:
`POST/GET https://{funcApp}.azurewebsites.net/api/{endpoint}`

<details>
<summary>Click to expand full ARM actions list</summary>

**Pack Management (packmgmt)**:
1. AddPack — IaaS (tagged VMs, left side)
2. RemoveTag — IaaS (tagged VMs, left side)
3. RemoveTag All — IaaS (all packs)
4. AddPack — IaaS (non-tagged VMs, right side)
5. AddPack — PaaS (non-monitored services)
6. RemoveTag — PaaS (monitored services)
7. importPack — Import pack JSON definition
8. AddPack — Discovery (enable discovery)
9. RemoveTag — Discovery (remove discovery)
10. AddPack — Discovery results (enable monitoring from results)

**Alert Management (alertmgmt)**:
11. Enable — pack alerts
12. Disable — pack alerts
13. Update action group — pack alerts
14. Delete — pack alerts
15. Enable — other alerts
16. Disable — other alerts
17. Update action group — other alerts
18. Delete — other alerts

**Agent Management (agentMgmt)**:
19. AddAgent — install AMA
20. RemoveAgent — remove AMA

**Policy Management (policymgmt)**:
21. Remediate — trigger policy remediation
22. Scan — check policy compliance

**Operations (opstasksondemand)**:
23. Update AvailablePacks
24. Update All (from servers tab)
25. Update All (from services tab)

</details>

### 2.7 Authentication Model

| Layer | Current Method | Portal Equivalent |
|-------|---------------|-------------------|
| **User identity** | Azure portal signed-in user (implicit) | MSAL / Entra ID OAuth 2.0 |
| **ARG queries** | Workbook implicit auth | Azure SDK with `DefaultAzureCredential` / token |
| **KQL queries** | Workspace cross-component auth | `LogsQueryClient` with user token |
| **App Insights** | Workspace cross-component auth | `LogsQueryClient` targeting AI resource |
| **Function App** | Logic App relay + function key | **Direct call with Entra ID token** (no Logic App) |
| **RBAC** | Azure portal enforces | Must check RBAC or rely on 403s from APIs |

---

## 3. Framework Recommendation

### 3.1 Comparison

| Criteria | React + Vite | Next.js | Blazor (WASM) | Vue.js |
|----------|-------------|---------|---------------|--------|
| **Azure SDK support** | Excellent (`@azure/*`) | Excellent | Good (REST) | Excellent |
| **MSAL integration** | `@azure/msal-react` — first-class | Same, plus SSR options | MSAL.NET | `@azure/msal-browser` |
| **Component ecosystem** | Fluent UI React (`@fluentui/react-components`) | Same | Fluent UI Blazor | No official Fluent UI |
| **Azure portal look-and-feel** | Fluent UI v9 = portal design language | Same | Close | Different |
| **Data grids** | AG Grid, TanStack Table | Same | Syncfusion Blazor | AG Grid |
| **Charts** | Recharts, Chart.js | Same | Chart.js via interop | Chart.js |
| **Hosting on Azure** | Static Web Apps, Container App | Container App, App Service | Static Web Apps | Static Web Apps |
| **Developer ecosystem** | Largest | Large | Smaller | Medium |
| **TypeScript** | Native | Native | N/A (C#) | Supported |
| **Complexity for this use case** | Right-sized | Overkill (SSR unneeded) | Different paradigm | Viable but less tooling |

### 3.2 Recommendation: **React + Vite + Fluent UI v9**

**Why React:**
- The `@azure/msal-react` library provides first-class authentication with `MsalProvider`, `useMsal()`, `AuthenticatedTemplate`, and `useAccount()` hooks
- `@fluentui/react-components` (Fluent UI v9) is Microsoft's own design system — identical look to the Azure Portal
- All Azure SDKs (`@azure/arm-resourcegraph`, `@azure/monitor-query`, `@azure/arm-monitor`, etc.) have TypeScript-first React-friendly APIs
- The workbook's tab-based layout, data grids, pie charts, and action buttons map naturally to React components

**Why Vite (not Next.js):**
- This is a pure SPA — no SSR/SEO required
- All data comes from Azure APIs on the client side (user token)
- Vite is faster for development and simpler to deploy
- Can be hosted as an Azure Static Web App (free tier) or built into a container

**Why Fluent UI v9:**
- Identical visual language to Azure Portal
- Built-in components: `DataGrid`, `Tab`, `TabList`, `Dialog`, `Dropdown`, `Button`, `Badge`, `Spinner`, `Card`, `InfoLabel`
- Theming matches Azure Portal light/dark modes
- Accessible by default (WCAG 2.1)

### 3.3 Hosting Recommendation

| Option | Pros | Cons | Cost |
|--------|------|------|------|
| **Azure Static Web App** | Free/cheap, built-in auth, custom domain, CI/CD | No server-side logic (fine for SPA) | Free or Standard ($9/mo) |
| **Azure Container App** | Full control, can bundle BFF | More complex, needs container registry | ~$5-20/mo |
| **Azure App Service** | Familiar, easy deployment | Overkill for SPA | ~$13+/mo |

**Recommendation: Azure Static Web App (Standard)**
- Built-in Entra ID authentication support
- API proxying to the existing Function App (no CORS issues)
- Global CDN distribution
- Free SSL

---

## 4. Architecture

### 4.0 Removing the Logic App

The Logic App currently serves as a **pure relay/router** between the workbook and the Function App. Its entire workflow is:
1. Receive HTTP POST from workbook ARM Action
2. Parse the `function` field from the body
3. Retrieve the Function App key from Key Vault
4. Switch on the function name (`packmgmt`, `alertmgmt`, `opstasksondemand`, `agentMgmt`) and forward `functionBody` to the corresponding Function App endpoint

**With a custom portal, the Logic App is completely unnecessary.** The portal can:
- Call the Function App endpoints directly via HTTPS
- Acquire the function key via ARM API (`listkeys`) or use Entra ID authentication on the Function App
- Eliminate ~$30-50/mo Logic App costs and remove a latency hop

**Logic App → Direct Function App Mapping:**

| Workbook (via Logic App) | Direct Function URL | Body Change |
|--------------------------|-------------------|-------------|
| `{ "function": "packmgmt", "functionBody": {...} }` | `POST https://{funcApp}.azurewebsites.net/api/packmgmt` | Send `functionBody` content directly |
| `{ "function": "alertmgmt", "functionBody": {...} }` | `POST https://{funcApp}.azurewebsites.net/api/alertConfigMgmt` | Send `functionBody` content directly |
| `{ "function": "opstasksondemand", "functionBody": {...} }` | `POST https://{funcApp}.azurewebsites.net/api/opstasksondemand` | Send `functionBody` content directly |
| `{ "function": "agentMgmt", "functionBody": {...} }` | `POST https://{funcApp}.azurewebsites.net/api/agentMgmt` | Send `functionBody` content directly |
| `{ "function": "policymgmt", "functionBody": {...} }` | `POST https://{funcApp}.azurewebsites.net/api/policymgmt` | Send `functionBody` content directly |

**Note:** The workbook uses `"alertmgmt"` as the function name, but the actual Function App endpoint is `alertConfigMgmt`. The Logic App silently handles this rename.

**Authentication options for direct calls:**
1. **Function Key** — retrieve via `listKeys` ARM API, pass as `x-functions-key` header or `?code=` query param
2. **Entra ID (recommended)** — enable Entra ID authentication on the Function App (Easy Auth), then pass the user's Bearer token directly. This is more secure and eliminates key management.

```
┌──────────────────────────────────────────────────────────────────┐
│                        User Browser                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  React SPA (Fluent UI v9)                                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │  │
│  │  │  MSAL    │ │  ARG     │ │  KQL     │ │  Function│     │  │
│  │  │  Auth    │ │  Client  │ │  Client  │ │  Client  │     │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘     │  │
│  └───────┼─────────────┼───────────┼─────────────┼───────────┘  │
└──────────┼─────────────┼───────────┼─────────────┼──────────────┘
           │             │           │             │
           ▼             ▼           ▼             ▼
    ┌──────────┐  ┌──────────┐ ┌──────────┐ ┌──────────────┐
    │ Entra ID │  │  Azure   │ │  Log     │ │ Function App │
    │ (OAuth)  │  │  Resource│ │ Analytics│ │ (Direct)     │
    │          │  │  Graph   │ │ + App    │ │              │
    │ Scopes:  │  │          │ │ Insights │ │ Endpoints:   │
    │ user.read│  │          │ │          │ │ /api/packmgmt│
    │ ARM      │  │          │ │          │ │ /api/alert.. │
    │ LAW      │  │          │ │          │ │ /api/agent.. │
    │ FuncApp  │  │          │ │          │ │ /api/config  │
    └──────────┘  └──────────┘ └──────────┘ └──────────────┘
```

> **No Logic App in the architecture.** The portal calls Function App endpoints directly.

### 4.1 Authentication Flow

```
1. User opens portal → MSAL redirect to Entra ID login
2. User consents to scopes: 
   - https://management.azure.com/.default (ARM, ARG)
   - https://api.loganalytics.io/.default (Log Analytics)
   - api://<func-app-client-id>/.default (Function App, if using Entra auth)
3. Access token cached in browser (MSAL cache)
4. Each API call acquires token silently from cache (or refreshes)
5. Token passed as Bearer header to Azure APIs and Function App
```

### 4.2 Function App Authentication (Entra ID — Recommended)

Enable **Entra ID authentication** (Easy Auth) on the Function App:
1. In Function App → Authentication → Add identity provider → Microsoft
2. Register a new app or use existing → sets `MICROSOFT_PROVIDER_AUTHENTICATION_SECRET`
3. The Function App now requires a valid Bearer token
4. The portal acquires a token for the Function App's client ID via MSAL
5. **No function keys needed** — Entra ID handles auth, RBAC handles authorization

This is more secure than function keys because:
- Keys can be leaked; tokens expire and are user-scoped
- You get audit trails of who called what
- No Key Vault dependency for the portal

**Fallback option:** If you prefer function keys, the portal can retrieve them via:
```
POST https://management.azure.com/{funcAppId}/host/default/listkeys?api-version=2022-03-01
Authorization: Bearer <ARM-token>
```

### 4.3 API Layer Mapping

| Workbook Feature | Azure SDK / Method | API Endpoint |
|-----------------|-----------|-------------|
| ARG queries | `@azure/arm-resourcegraph` → `ResourceGraphClient.resources()` | `POST https://management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01` |
| KQL queries (LAW) | `@azure/monitor-query` → `LogsQueryClient.queryWorkspace()` | `POST https://api.loganalytics.io/v1/workspaces/{id}/query` |
| KQL queries (AI) | `@azure/monitor-query` → `LogsQueryClient.queryResource()` | `POST https://api.applicationinsights.io/v1/apps/{id}/query` |
| Pack management | `fetch()` with Bearer token | `POST https://{funcApp}.azurewebsites.net/api/packmgmt` |
| Alert management | `fetch()` with Bearer token | `POST https://{funcApp}.azurewebsites.net/api/alertConfigMgmt` |
| Agent management | `fetch()` with Bearer token | `POST https://{funcApp}.azurewebsites.net/api/agentMgmt` |
| Ops tasks | `fetch()` with Bearer token | `POST https://{funcApp}.azurewebsites.net/api/opstasksondemand` |
| Config/metadata | `fetch()` with Bearer token | `GET https://{funcApp}.azurewebsites.net/api/config?Action=...` |
| Discovery results | `fetch()` with Bearer token | `GET https://{funcApp}.azurewebsites.net/api/config?Action=getdiscoveryresults` |

### 4.4 Replacing Workspace KQL Queries with Config API

Several workbook KQL queries can be replaced with the existing `/api/config` endpoint, eliminating the need for direct Log Analytics access in some cases:

| Workbook KQL Query | Config API Equivalent |
|--------------------|----------------------|
| `AvailableIaaSPacks_CL` | `GET /api/config?Action=getavailableIaaSPacks` |
| `SupportedServices_CL` | `GET /api/config?Action=getSupportedServices` |
| `MonitoredPaaSTable_CL` | `GET /api/config?Action=getMonitoredPaaS` |
| `NonMonitoredPaaSTable_CL` | `GET /api/config?Action=getNonMonitoredPaaS` |
| `DiscoveryResults_CL` | `GET /api/config?Action=getdiscoveryresults` |

This means the portal may not need Log Analytics scope at all for most operations — only for Heartbeat and Discovery raw data views.

---

## 5. Detailed Implementation Plan

### Phase 1: Project Scaffolding & Auth (Week 1)

#### 1.1 Initialize Project
```bash
npm create vite@latest portal -- --template react-ts
cd portal
npm install @fluentui/react-components @fluentui/react-icons
npm install @azure/msal-browser @azure/msal-react
npm install @azure/arm-resourcegraph @azure/monitor-query @azure/identity
npm install @azure/arm-appservice
npm install @tanstack/react-query    # data fetching & caching
npm install react-router-dom         # tab navigation
npm install recharts                 # charts (pie, bar)
```

#### 1.2 Entra ID App Registration
- Register app in Azure AD: `AMP-AdminPortal`
- Platform: SPA, Redirect URI: `http://localhost:5173`, `https://<staticwebapp>.azurestaticapps.net`
- API Permissions:
  - `https://management.azure.com/user_impersonation` (Azure Management)
  - `https://api.loganalytics.io/Data.Read` (Log Analytics)
  - `user.read` (Graph — basic profile)
- Token configuration: Access tokens (v2), ID tokens

#### 1.3 MSAL Configuration
```typescript
// src/auth/msalConfig.ts
export const msalConfig = {
  auth: {
    clientId: "<app-registration-client-id>",
    authority: "https://login.microsoftonline.com/common",
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: "localStorage" },
};

export const loginRequest = {
  scopes: ["https://management.azure.com/.default"],
};

export const logAnalyticsRequest = {
  scopes: ["https://api.loganalytics.io/.default"],
};
```

#### 1.4 App Shell
- `<MsalProvider>` wrapping entire app
- `<FluentProvider theme={webLightTheme}>` for Fluent UI
- `<AuthenticatedTemplate>` / `<UnauthenticatedTemplate>` for login gate
- React Router with routes matching workbook tabs

#### 1.5 Deliverables
- [ ] Vite + React + TypeScript project created
- [ ] MSAL login/logout working
- [ ] Fluent UI theme applied
- [ ] Tab navigation shell with empty pages
- [ ] Deployed to Azure Static Web App (CI/CD via GitHub Actions)

---

### Phase 2: Core Services & Configuration Tab (Week 2)

#### 2.1 Azure Service Clients

```typescript
// src/services/argClient.ts
import { ResourceGraphClient } from "@azure/arm-resourcegraph";

export async function queryARG(
  token: string,
  query: string,
  subscriptions: string[]
): Promise<any[]> {
  const credential = { getToken: async () => ({ token, expiresOnTimestamp: 0 }) };
  const client = new ResourceGraphClient(credential);
  const result = await client.resources({
    query,
    subscriptions,
  });
  return result.data as any[];
}

// src/services/kqlClient.ts  
import { LogsQueryClient } from "@azure/monitor-query";

export async function queryWorkspace(
  token: string,
  workspaceId: string,
  query: string,
  timespan: string
): Promise<any[]> {
  const credential = { getToken: async () => ({ token, expiresOnTimestamp: 0 }) };
  const client = new LogsQueryClient(credential);
  const result = await client.queryWorkspace(workspaceId, query, { duration: timespan });
  return result.tables[0]?.rows ?? [];
}
```

#### 2.2 Configuration Page (replaces Configuration tab)
- Instance selector dropdown (ARG query for function apps with `tags.MonitorStarterPacksComponents`)
- Subscription multi-select
- Function App resource picker (filtered by instance) — also resolves the Function App URL for direct API calls
- Workspace resource picker (filtered by instance)
- Grafana instance picker (optional)
- **No Logic App picker needed** — portal calls Function App directly
- Action Group picker
- Azure Monitor Workspace picker (filtered by instance)
- **Save to localStorage** (replaces workbook "save" functionality)

#### 2.3 React Query Hooks

```typescript
// src/hooks/useARGQuery.ts
export function useARGQuery(queryKey: string, query: string, subscriptions: string[]) {
  const { instance } = useMsal();
  return useQuery({
    queryKey: [queryKey, subscriptions],
    queryFn: async () => {
      const token = await acquireToken(instance, managementScope);
      return queryARG(token, query, subscriptions);
    },
    staleTime: 60_000,  // 1 minute cache
  });
}
```

#### 2.4 Deliverables
- [ ] ARG client wrapper with token acquisition
- [ ] KQL client wrapper for Log Analytics
- [ ] KQL client wrapper for App Insights
- [ ] Configuration page with all parameter pickers
- [ ] Settings persisted to localStorage
- [ ] React Query integration with caching

---

### Phase 3: Status Dashboard (Week 3)

#### 3.1 Components
- **Active Alerts Grid** — DataGrid with severity icons, alert details link (opens Azure Portal blade)
- **IaaS Summary** — 3 pie charts: Monitoring Status, Agent Install Status, Servers/Pack
- **Tagged Resources Tiles** — tile cards with count per pack
- **Services Summary** — pie chart of PaaS alert counts by namespace
- **Dashboards List** — grid with links to workbooks/Grafana

#### 3.2 Chart Components
```typescript
// Using Recharts for pie charts
<PieChart>
  <Pie data={monitoringStatus} dataKey="count" nameKey="status" />
  <Legend />
  <Tooltip />
</PieChart>
```

#### 3.3 Deliverables
- [ ] Active Alerts grid with severity badges and portal links
- [ ] IaaS Summary with 3 pie charts
- [ ] Service Summary pie chart
- [ ] Dashboard listing with resource links
- [ ] Auto-refresh capability (configurable interval)

---

### Phase 4: Server Management (Week 4)

#### 4.1 Layout
Split-pane view (matching workbook):
- **Left**: Monitored Machines grid (merged query — tagged VMs + DCR associations)
- **Right**: Non-Monitored Machines grid

#### 4.2 Actions (Direct Function App Calls)
- **Add Pack** — select VMs + select packs → POST to `/api/packmgmt`
- **Remove Pack** — select VMs + select packs → POST
- **Remove All** — select VMs → POST with Pack="All"
- **Update Supported Packs** — POST to `/api/opstasksondemand`

#### 4.3 Action Confirmation Dialog
```typescript
<Dialog>
  <DialogSurface>
    <DialogTitle>Add Monitoring</DialogTitle>
    <DialogBody>
      <p>Add monitoring for <strong>{selectedPacks}</strong> to {selectedVMs.length} machine(s)?</p>
      <ul>{selectedVMs.map(vm => <li key={vm.id}>{vm.name}</li>)}</ul>
    </DialogBody>
    <DialogActions>
      <Button appearance="secondary" onClick={onCancel}>Cancel</Button>
      <Button appearance="primary" onClick={onConfirm}>Confirm</Button>
    </DialogActions>
  </DialogSurface>
</Dialog>
```

#### 4.4 Function App Client (Direct — No Logic App)

```typescript
// src/services/functionClient.ts
const FUNCTION_ENDPOINTS = {
  packmgmt: "/api/packmgmt",
  alertConfigMgmt: "/api/alertConfigMgmt",
  agentMgmt: "/api/agentMgmt",
  opstasksondemand: "/api/opstasksondemand",
  config: "/api/config",
} as const;

export async function callFunction(
  funcAppUrl: string,  // e.g. "https://AMP-mon3-e315fe-Function.azurewebsites.net"
  token: string,       // Entra ID token for the Function App
  endpoint: keyof typeof FUNCTION_ENDPOINTS,
  body?: Record<string, any>,
  queryParams?: Record<string, string>
) {
  const url = new URL(FUNCTION_ENDPOINTS[endpoint], funcAppUrl);
  if (queryParams) {
    Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    method: body ? "POST" : "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`Function call failed: ${response.status}`);
  return response.json();
}

// Example: Add monitoring pack (previously went through Logic App)
await callFunction(funcAppUrl, token, "packmgmt", {
  Action: "AddPack",
  Resources: selectedVMs,
  Pack: "ADDS",
  PackType: "IaaS",
  WorkspaceId: workspaceId,
  DefaultAG: actionGroupId,
  AzureMonitorWorkspaceId: amwId,
});

// Example: Get available packs (previously was a KQL query)
const packs = await callFunction(funcAppUrl, token, "config", undefined, {
  Action: "getavailableIaaSPacks",
});
```

#### 4.5 Deliverables
- [ ] Monitored Machines grid with pack/association columns
- [ ] Non-Monitored Machines grid with subscription filtering
- [ ] Pack selector dropdown (from AvailableIaaSPacks_CL)
- [ ] Add/Remove/Remove All action buttons with confirmation
- [ ] Toast notifications for action results
- [ ] Server state indicators (On/Off icons)

---

### Phase 5: Services (PaaS) Management (Week 5)

#### 5.1 Layout
Split-pane (matching workbook):
- **Left**: Monitored Services grid (from `MonitoredPaaSTable_CL`)
- **Right**: Non-Monitored Services grid (from `NonMonitoredPaaSTable_CL`)

#### 5.2 Components
- Service type filter dropdown (multi-select)
- Enable/Remove Monitoring buttons with confirmation
- "Update backend data" button (opstasksondemand)

#### 5.3 Deliverables
- [ ] Monitored PaaS services grid with type filtering
- [ ] Non-Monitored PaaS services grid
- [ ] Enable/Remove monitoring actions
- [ ] Backend data refresh action

---

### Phase 6: Alert Management (Week 6)

#### 6.1 Pack Alerts Sub-tab
- Pack filter dropdown (derived from ARG)
- Alert rules grid (scheduled query + metric + activity log alerts)
- Multi-select for bulk operations
- Action panel: Enable/Disable/Delete/Update Action Group

#### 6.2 Other Alerts Sub-tab
- Same layout but for alerts without pack tags

#### 6.3 Action Group Picker
- Grid of enabled action groups with email receiver info
- Single-select for "Update Action Group" operation

#### 6.4 Deliverables
- [ ] Pack alerts grid with filtering
- [ ] Other alerts grid
- [ ] Bulk enable/disable/delete actions
- [ ] Action group update with picker
- [ ] Confirmation dialogs for destructive actions (delete)

---

### Phase 7: Packs & DCR Management (Week 7)

#### 7.1 IaaS Packs Association
- Grid: Pack name, DCR rule name, associated machine count
- Drill-down: click a rule → show associated machines

#### 7.2 DCR Details
- Comprehensive grid showing DCR configuration
- Columns: Type, location, syslog streams, event logs, perf counters, endpoints, transforms, workspace, state
- Cell formatters: link to Azure Portal DCR blade for editing

#### 7.3 VMInsights Status
- Left: Servers with VM Insights DCR (count of associations)
- Right: VM Insights DCRs with server counts
- Drill-down: selected DCR → list of associated servers

#### 7.4 Import Pack
- Multi-line text input for pack JSON definition
- "Import Pack Definition" button → `packmgmt.importPack`

#### 7.5 Pack Details (Read-only)
- IaaS Packs: Name, Tag, NumberOfRules, NumberOfAlerts, AlertNames
- Services Packs: Category, namespace, service, metricnamespace, tag, NumberOfMetrics

#### 7.6 Deliverables
- [ ] Pack association grid with drill-down
- [ ] DCR details grid with portal links
- [ ] VMInsights status dashboard
- [ ] Pack import form
- [ ] IaaS and Services pack details tables

---

### Phase 8: Agents & Discovery (Week 8)

#### 8.1 Agents Tab
- Comprehensive agent grid: OS, AMA state, upgrade mode, dependency agent
- Install/Uninstall buttons per selection
- Agent status summary tiles (count by extension)

#### 8.2 Heartbeat Sub-tab
- Grid: Computer, Last Heartbeat, SecondsAgo
- Conditional formatting: green < 600s, red > 600s

#### 8.3 VM Applications Sub-tab
- Grid: Computer, Application Version, Gallery

#### 8.4 Discovery
- **Results**: Grid of latest discovery results + "Enable Monitoring" action
- **Config**: Tagged/Non-tagged VMs for discovery + Enable/Remove Discovery actions
- **Data**: Raw discovery data viewer with computer selector and time filter
- **Policies**: Remediate and Scan compliance buttons

#### 8.5 Deliverables
- [ ] Agent management grid with install/remove actions
- [ ] Heartbeat monitoring with thresholds
- [ ] VM Applications inventory
- [ ] Discovery results with monitoring enablement
- [ ] Discovery configuration with tag management
- [ ] Raw discovery data viewer
- [ ] Policy remediation and compliance scanning

---

### Phase 9: Logs & Observability (Week 9)

#### 9.1 Function Invocation Viewer
- Time range selector
- Function name dropdown (from App Insights requests)
- Invocations grid: timestamp, operation name, success, result code, duration
- Drill-down: selected invocation → trace/exception details

#### 9.2 Deliverables
- [ ] App Insights query integration
- [ ] Function invocation listing with filtering
- [ ] Trace/exception detail viewer
- [ ] Time range picker

---

### Phase 10: Polish, Testing & Deployment (Week 10-11)

#### 10.1 UX Enhancements
- Dark mode support (Fluent UI `webDarkTheme`)
- Responsive layout for tablet/mobile
- Loading skeletons for data grids
- Error boundaries with retry
- Breadcrumb navigation
- Instance-name banner (persistent header)

#### 10.2 Performance
- React Query caching (staleTime, gcTime)
- Pagination for large ARG result sets (>1000 rows)
- Debounced search/filter inputs
- Lazy-loaded route components (`React.lazy()`)

#### 10.3 Testing
- Unit tests: Vitest + React Testing Library
- Integration tests: MSW (Mock Service Worker) for Azure API mocking
- E2E tests: Playwright with Azure AD test account

#### 10.4 Deployment
- Azure Static Web App with GitHub Actions CI/CD
- `staticwebapp.config.json` for route fallback and API proxy
- Staging/Production environments

#### 10.5 Deliverables
- [ ] Dark mode toggle
- [ ] Responsive design
- [ ] Unit test coverage > 70%
- [ ] CI/CD pipeline
- [ ] Staging deployment
- [ ] Production deployment

---

## 6. Project Structure

```
portal/
├── public/
│   └── favicon.ico
├── src/
│   ├── main.tsx                          # Entry point
│   ├── App.tsx                           # Root: MsalProvider + FluentProvider + Router
│   ├── auth/
│   │   ├── msalConfig.ts                 # MSAL configuration
│   │   ├── AuthProvider.tsx              # Login/logout wrapper
│   │   └── useToken.ts                   # Token acquisition hooks
│   ├── services/
│   │   ├── argClient.ts                  # Azure Resource Graph client
│   │   ├── kqlClient.ts                  # Log Analytics / App Insights client
│   │   ├── functionClient.ts             # Direct Function App calls
│   │   ├── functionAppClient.ts          # Function key + custom endpoint calls
│   │   └── queries/
│   │       ├── argQueries.ts             # All ARG query strings (constants)
│   │       └── kqlQueries.ts             # All KQL query strings (constants)
│   ├── hooks/
│   │   ├── useARGQuery.ts                # React Query + ARG
│   │   ├── useKQLQuery.ts                # React Query + KQL
│   │   ├── useBackendAction.ts           # React Query mutation + Function App
│   │   └── useConfig.ts                  # Configuration context (instance, workspace, etc.)
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── AppShell.tsx              # Header + sidebar + content
│   │   │   ├── TabNavigation.tsx         # Main tab bar
│   │   │   └── InstanceBanner.tsx        # Current instance display
│   │   ├── common/
│   │   │   ├── DataGrid.tsx              # Reusable ARG/KQL data grid
│   │   │   ├── PieChartWidget.tsx         # Reusable pie chart
│   │   │   ├── TilesWidget.tsx           # Reusable tile cards
│   │   │   ├── ConfirmDialog.tsx         # Action confirmation dialog
│   │   │   ├── ResourceLink.tsx          # Azure Portal resource link
│   │   │   └── StatusBadge.tsx           # On/Off, severity badges
│   │   └── shared/
│   │       ├── PackSelector.tsx          # Pack multi-select dropdown
│   │       ├── SubscriptionPicker.tsx    # Subscription multi-select
│   │       └── TimeRangePicker.tsx       # Time range selector
│   ├── pages/
│   │   ├── GettingStarted.tsx
│   │   ├── Status/
│   │   │   ├── StatusPage.tsx            # Sub-tab container
│   │   │   ├── ActiveAlerts.tsx
│   │   │   ├── IaaSSummary.tsx
│   │   │   ├── ServicesSummary.tsx
│   │   │   └── Dashboards.tsx
│   │   ├── Servers/
│   │   │   ├── ServersPage.tsx           # Split-pane container
│   │   │   ├── MonitoredMachines.tsx
│   │   │   └── NonMonitoredMachines.tsx
│   │   ├── Services/
│   │   │   ├── ServicesPage.tsx
│   │   │   ├── MonitoredServices.tsx
│   │   │   └── NonMonitoredServices.tsx
│   │   ├── AlertRules/
│   │   │   ├── AlertRulesPage.tsx
│   │   │   ├── PackAlerts.tsx
│   │   │   └── OtherAlerts.tsx
│   │   ├── Packs/
│   │   │   ├── PacksPage.tsx
│   │   │   ├── PackAssociations.tsx
│   │   │   ├── DCRDetails.tsx
│   │   │   ├── VMInsightsStatus.tsx
│   │   │   ├── ImportPack.tsx
│   │   │   ├── IaaSPackDetails.tsx
│   │   │   └── ServicesPackDetails.tsx
│   │   ├── Agents/
│   │   │   ├── AgentsPage.tsx
│   │   │   ├── AgentsList.tsx
│   │   │   ├── Heartbeat.tsx
│   │   │   └── VMApplications.tsx
│   │   ├── Discovery/
│   │   │   ├── DiscoveryPage.tsx
│   │   │   ├── DiscoveryResults.tsx
│   │   │   ├── DiscoveryConfig.tsx
│   │   │   └── DiscoveryData.tsx
│   │   ├── Configuration/
│   │   │   └── ConfigurationPage.tsx
│   │   └── Logs/
│   │       └── LogsPage.tsx
│   ├── store/
│   │   └── configStore.ts                # Zustand or Context for global config
│   └── types/
│       ├── azure.ts                      # Azure resource type definitions
│       ├── packs.ts                      # Pack-related types
│       └── alerts.ts                     # Alert-related types
├── staticwebapp.config.json              # SWA routing config
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## 7. Key Dependencies

```json
{
  "dependencies": {
    "@azure/msal-browser": "^3.x",
    "@azure/msal-react": "^2.x",
    "@azure/arm-resourcegraph": "^4.x",
    "@azure/monitor-query": "^1.x",
    "@fluentui/react-components": "^9.x",
    "@fluentui/react-icons": "^2.x",
    "@tanstack/react-query": "^5.x",
    "react-router-dom": "^6.x",
    "recharts": "^2.x",
    "react": "^18.x",
    "react-dom": "^18.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^5.x",
    "vitest": "^1.x",
    "@testing-library/react": "^14.x",
    "msw": "^2.x",
    "playwright": "^1.x"
  }
}
```

---

## 8. Migration Strategy

### 8.1 Parallel Operation
- Keep the workbook and portal running side-by-side during development
- Workbook continues to use Logic App → Function App path
- Portal calls Function App directly (no Logic App)
- Both use the same Function App backend — no backend code changes required
- Once portal is validated, Logic App can be decommissioned

### 8.2 Feature Parity Milestones
1. **MVP** (Phases 1-4): Configuration + Status + Server Management → can replace 60% of workbook usage
2. **Core** (Phases 5-7): + Services + Alerts + Packs → 90% feature parity
3. **Complete** (Phases 8-10): + Agents + Discovery + Logs → 100% feature parity

### 8.3 Advantages Over Workbook

| Aspect | Workbook | Portal |
|--------|----------|--------|
| **Performance** | Slow with many queries; sequential loading | Parallel data fetching, React Query caching |
| **UX** | Limited to workbook primitives | Full custom UI, drag-drop, modals, toasts |
| **Validation** | No input validation | Form validation before API calls |
| **Error handling** | Generic ARM errors | Friendly error messages, retry logic |
| **Multi-instance** | One workbook per instance | Switch instances without reloading |
| **Offline/state** | Lost on page refresh | LocalStorage persistence |
| **Extensibility** | JSON editing of 5000+ lines | Component-based, testable, maintainable |
| **Access** | Requires Azure Portal access | Standalone URL, bookmarkable |
| **Mobile** | Not responsive | Responsive design |

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **CORS on ARM APIs** | API calls blocked from SPA | ARM APIs allow CORS with valid tokens; Function App needs CORS config for portal domain |
| **Function App CORS** | Direct calls blocked | Add portal domain to Function App CORS settings (or use SWA API proxy) |
| **Token scope juggling** | Multiple audiences (ARM, LAW, AI) | MSAL multi-resource token acquisition; acquireTokenSilent per scope |
| **Large ARG result sets** | Timeouts or pagination issues | Use `$top` and `$skipToken`; show progressive loading |
| **KQL query differences** | Workspace-scoped vs AI-scoped | Separate client instances; `queryWorkspace` vs `queryResource` |
| **Function key retrieval** | Needs ARM call for key | Cache key after first retrieval; refresh on 401 |
| **Workbook parity gap** | Users miss workbook features | Phase 8.2 milestones ensure complete parity |
| **Auth consent** | Users may not consent to all scopes | Progressive consent; request scopes when needed |

---

## 10. Open Questions

1. **Custom domain**: Should the portal have a custom domain (e.g., `monitor.contoso.com`)?
2. **Multi-tenant**: Should the portal support multi-tenant access or single-tenant only?
3. **RBAC enforcement**: Should the portal check RBAC roles upfront, or rely on API 403s?
4. **Notifications**: Should the portal have real-time notifications (e.g., SignalR for pack deployment progress)?
5. **Grafana integration**: Should the portal embed Grafana dashboards (iframe) or just link to them?
6. **Data export**: Should the portal support CSV/Excel export from grids (workbook has this)?
