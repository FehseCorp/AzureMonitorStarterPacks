// ARG query constants — extracted from extendedwb.json workbook

/** List all AMP instances (function apps with MonitorStarterPacksComponents tag) */
export const ARG_INSTANCES = `
resources
| where type =~ 'microsoft.web/sites' and ['kind'] =~ 'functionapp'
| where isnotempty(tags.MonitorStarterPacksComponents)
| project instanceNames=tags.instanceName
`;

/** Function Apps for a given instance */
export const argFunctionApps = (instanceName: string) => `
resources
| where type =~ 'microsoft.web/sites' and ['kind'] =~ 'functionapp'
| where isnotempty(tags.MonitorStarterPacksComponents)
| where tags.instanceName == '${instanceName}'
| project id, name
`;

/** Log Analytics Workspaces for a given instance */
export const argWorkspaces = (instanceName: string) => `
resources
| where type == "microsoft.operationalinsights/workspaces"
| where tags.instanceName =~ '${instanceName}'
| project id, name
`;

/** Action Groups (enabled) */
export const ARG_ACTION_GROUPS = `
resources
| where type == "microsoft.insights/actiongroups"
| where properties.enabled == 'true'
| project id, name, resourceGroup, subscriptionId
`;

/** Azure Monitor Workspaces for a given instance */
export const argAzureMonitorWorkspaces = (instanceName: string) => `
resources
| where type =~ 'microsoft.monitor/accounts'
| where tags.instanceName =~ '${instanceName}'
| project id, label=name
`;

/** Grafana instances for a given instance */
export const argGrafanaInstances = (instanceName: string) => `
resources
| where type =~ "microsoft.dashboard/grafana"
| where isnotempty(tags.monitorStarterPacksComponents) or isnotempty(tags.MonitorStarterPacksComponents)
| where tags.instanceName == '${instanceName}'
| project id, label=properties.endpoint
`;

/** App Insights resource for a given function app name */
export const argAppInsights = (functionAppName: string) => `
resources
| where type =~ 'microsoft.insights/components'
| where name contains '${functionAppName}'
| project id, name
`;

// ── Status Tab Queries ──────────────────────────────────────────────

/** Active alerts joined with AMP alert rules */
export const argActiveAlerts = (instanceName: string) => `
alertsmanagementresources
| where ['type'] == 'microsoft.alertsmanagement/alerts'
| project ['Alert Id']=id, resourceId=properties.context.context.resourceId, alertRule=tolower(tostring(properties.essentials.alertRule)), status=properties.context.status, severity=properties.context.context.severity
| where isnotempty(alertRule)
| join (resources
  | where type == "microsoft.insights/scheduledqueryrules" or type == "microsoft.insights/metricalerts" or type == 'microsoft.insights/activitylogalerts'
  | where isnotempty(tags.MonitorStarterPacks) and tags.instanceName =~ '${instanceName}'
  | extend alertRule=tolower(tostring(['id']))) on alertRule
| project id, ['AlertName']=name, ['Details']=['Alert Id'], Status=status, Resource=resourceId, Sev=severity
| where Status=='Activated'
`;

/** Monitoring status — monitored vs not-monitored VMs */
export const argMonitoringStatus = (instanceName: string) => `
resources
| where type =~ 'microsoft.hybridcompute/machines' or type =~ 'microsoft.compute/virtualmachines'
| extend MonitorStatus=iff(isnotempty(tostring(tags.MonitorStarterPacks)),'Monitored','Not Monitored')
| where tags.instanceName =~ '${instanceName}'
| summarize count() by MonitorStatus
`;

/** Agent install status — AMA extension presence */
export const argAgentStatus = (instanceName: string) => `
Resources
| where type == 'microsoft.compute/virtualmachines'
| where tags.instanceName =~ '${instanceName}'
| extend JoinID = toupper(id)
| join kind=leftouter(
    Resources
    | where type == 'microsoft.compute/virtualmachines/extensions' and name in ('AzureMonitorLinuxAgent', 'AzureMonitorWindowsAgent')
    | extend VMId = toupper(substring(id, 0, indexof(id, '/extensions'))), ExtensionName = name
) on $left.JoinID == $right.VMId
| union (Resources
  | where type == 'microsoft.hybridcompute/machines'
  | where tags.instanceName =~ '${instanceName}'
  | extend JoinID = toupper(id)
  | join kind=leftouter(
      Resources
      | where type == 'microsoft.hybridcompute/machines/extensions' and name in ('AzureMonitorLinuxAgent', 'AzureMonitorWindowsAgent')
      | extend VMId = toupper(substring(id, 0, indexof(id, '/extensions'))), ExtensionName = name
  ) on $left.JoinID == $right.VMId)
| summarize count() by AgentInstalled=iff(isempty(ExtensionName),"No","Yes")
`;

/** Servers per pack — DCR associations grouped by pack tag */
export const argServersPerPack = (instanceName: string) => `
resources
| where type == "microsoft.insights/datacollectionrules"
| extend MPs=tostring(['tags'].MonitorStarterPacks)
| where isnotempty(MPs)
| where tags.instanceName =~ '${instanceName}'
| summarize by Pack=MPs, rulename=tostring(name)
| join (insightsresources
  | where type == "microsoft.insights/datacollectionruleassociations"
  | extend resourceId=split(id,'/providers/Microsoft.Insights/')[0]
  | where isnotnull(properties.dataCollectionRuleId)
  | project rulename=tostring(split(properties.dataCollectionRuleId,"/")[8]), resourceName=tostring(split(resourceId,"/")[8]), resourceId) on rulename
| project-away rulename, rulename1, resourceId
| summarize Associated=count() by Pack
| sort by Pack asc
`;

/** Tagged resources per pack tag value (tiles) */
export const ARG_TAGGED_RESOURCES = `
resources
| where type =~ 'microsoft.hybridcompute/machines' or type =~ 'microsoft.compute/virtualmachines'
| project name, MPs=tags.MonitorStarterPacks
| where isnotnull(MPs)
| mv-expand (split(MPs,','))
| summarize Total=count() by tostring(MPs)
| sort by MPs asc
`;

/** PaaS alert counts by service namespace */
export const argPaaSAlertCounts = (instanceName: string) => `
resources
| where tolower(type) in ("microsoft.insights/metricalerts")
| where isnotempty(tags.MonitorStarterPacks) and tags.instanceName =~ '${instanceName}'
| project nameSpace=tolower(strcat(tostring(split(properties.scopes[0],"/")[-3]),"/",tostring(split(properties.scopes[0],"/")[-2]))), Target=split(properties.scopes[0],"/")[-1]
| union (resources
  | where tolower(type) in ("microsoft.insights/activitylogalerts")
  | where isnotempty(tags.MonitorStarterPacks) and tags.instanceName =~ '${instanceName}'
  | project nameSpace=tolower(strcat(tostring(split(properties.scopes[0],"/")[-3]),"/",tostring(split(properties.scopes[0],"/")[-2]))), Target=split(properties.scopes[0],"/")[-1])
| distinct tostring(Target), nameSpace
| summarize Total=count() by nameSpace
`;

/** Dashboards — workbooks + Grafana */
export const ARG_DASHBOARDS = `
resources
| where ['type'] =~ 'microsoft.insights/workbooks' or ['type'] =~ 'microsoft.dashboard/dashboards'
| extend realName=iff(['type']=~'microsoft.insights/workbooks', properties.displayName, name)
| project id, Name=realName, type, MP=tags.MonitorStarterPacks
| where isnotnull(MP)
| union (
  resources
  | where ['type'] =~ 'microsoft.dashboard/grafana'
  | project id, Name=name, type, MP=tags.MonitorStarterPacksComponents
  | where isnotnull(MP))
| project Link=id, Name, type=iff(['type']=~'microsoft.insights/workbooks',"Workbook",iff(['type']=~'microsoft.dashboard/grafana', "Azure Managed Grafana", "Azure Monitor Dashboard with Grafana"))
`;

// ── Servers tab ──

/** DCR associations per resource (hidden helper for merge) */
export const ARG_DCR_ASSOCIATIONS = `
insightsresources
| where type == "microsoft.insights/datacollectionruleassociations"
| extend resourceId=split(id,'/providers/Microsoft.Insights/')[0]
| where isnotnull(properties.dataCollectionRuleId)
| project rulename=tostring(split(properties.dataCollectionRuleId,"/")[8]),resourceName=tostring(split(resourceId,"/")[8]),resourceId=tolower(tostring(resourceId))
| join kind= inner  (
resources
| where type == "microsoft.insights/datacollectionrules"
| extend MPs=tostring(['tags'].MonitorStarterPacks)
| where isnotempty(MPs)
| where MPs !in~ ('WinDisc', 'LxDisc')
| summarize by Pack=MPs,rulename=tostring(name)) on rulename
| summarize by resourceId, Pack
| summarize Packs=tostring(make_list(Pack)) by resourceId
| project Packs2=tostring(Packs), resourceId
`;

/** Tagged (monitored) VMs and Arc machines */
export const argTaggedVMs = (instanceName: string) => `
resources | where type =~ 'microsoft.hybridcompute/machines'
| extend MP=tolower(tags.MonitorStarterPacks), instanceName=tolower(tags.instanceName),state=iff(properties.status =='Connected','On','Off')
| where isnotempty(MP) and instanceName == '${instanceName.toLowerCase()}'
| where MP !in~ ('WinDisc', 'LxDisc')
| project Resource=id,['Resource Group']=resourceGroup,Packs=tags.MonitorStarterPacks, OS=properties.osType, subscriptionId, Location=location, state
| union (resources | where type =~ 'microsoft.compute/virtualmachines'
| extend MP=tolower(tags.MonitorStarterPacks), instanceName=tolower(tags.instanceName),state=iff(properties.extended.instanceView.powerState.code =='PowerState/running','On','Off')
| where MP !in~ ('WinDisc', 'LxDisc')
| where isnotempty(MP) and instanceName == '${instanceName.toLowerCase()}' and (tolower(tags.Vendor) != 'databricks')
| project Resource=id,['Resource Group']=resourceGroup,Packs=tags.MonitorStarterPacks, OS=properties.storageProfile.osDisk.osType, subscriptionId, Location=location, state)
`;

// ── Alerts tab ──

/** Alert rules associated with MonitorStarterPacks (pack alerts) */
export const argPackAlerts = (instanceName: string) => `
resources
| where tolower(type) in ("microsoft.insights/scheduledqueryrules","microsoft.insights/metricalerts","microsoft.insights/activitylogalerts")
| where isnotempty(tags.MonitorStarterPacks) and tags.instanceName =~ '${instanceName}'
| project id, name, type, Pack=tostring(tags.MonitorStarterPacks), Enabled=tostring(properties.enabled), Severity=tostring(properties.severity), Description=tostring(properties.description), resourceGroup, subscriptionId
`;

/** Alert rules NOT associated with MonitorStarterPacks (other alerts) */
export const ARG_OTHER_ALERTS = `
resources
| where tolower(type) in ("microsoft.insights/scheduledqueryrules","microsoft.insights/metricalerts","microsoft.insights/activitylogalerts")
| where isempty(tags.MonitorStarterPacks)
| project id, name, type, Enabled=tostring(properties.enabled), Severity=tostring(properties.severity), Description=tostring(properties.description), resourceGroup, subscriptionId
`;

/** Action groups with email receivers */
export const ARG_ACTION_GROUPS_WITH_EMAILS = `
resources
| where type == "microsoft.insights/actiongroups"
| where properties.enabled == true
| project id, name, resourceGroup, subscriptionId, emailReceivers=properties.emailReceivers
`;

// ── Packs tab ──

/** Pack association detail — DCR rules per pack with associated machine list */
export const argPackAssociations = (instanceName: string) => `
resources
| where type == "microsoft.insights/datacollectionrules"
| extend Pack=tostring(tags.MonitorStarterPacks)
| where isnotempty(Pack) and tags.instanceName =~ '${instanceName}'
| where Pack !in~ ('WinDisc', 'LxDisc')
| project ruleId=id, ruleName=name, Pack
| join kind=leftouter (
  insightsresources
  | where type == "microsoft.insights/datacollectionruleassociations"
  | extend resourceId=tostring(split(id,'/providers/Microsoft.Insights/')[0])
  | where isnotnull(properties.dataCollectionRuleId)
  | project ruleId=tostring(properties.dataCollectionRuleId), associatedResource=resourceId
) on ruleId
| summarize Associated=countif(isnotempty(associatedResource)), Machines=make_list_if(associatedResource, isnotempty(associatedResource)) by Pack, ruleName, ruleId
| sort by Pack asc, ruleName asc
`;

/** DCR configuration details */
export const argDCRDetails = (instanceName: string) => `
resources
| where type == "microsoft.insights/datacollectionrules"
| where isnotempty(tags.MonitorStarterPacks) and tags.instanceName =~ '${instanceName}'
| project id, name, Pack=tostring(tags.MonitorStarterPacks), location, kind,
    dataSources=properties.dataSources,
    destinations=properties.destinations,
    dataFlows=properties.dataFlows,
    dataCollectionEndpointId=tostring(properties.dataCollectionEndpointId),
    resourceGroup, subscriptionId
`;

/** VMInsights — servers with VMInsights DCR associations */
export const argVMInsightsServers = (instanceName: string) => `
insightsresources
| where type == "microsoft.insights/datacollectionruleassociations"
| extend resourceId=tostring(split(id,'/providers/Microsoft.Insights/')[0])
| where isnotnull(properties.dataCollectionRuleId)
| project ruleId=tostring(properties.dataCollectionRuleId), resourceId
| join kind=inner (
  resources
  | where type == "microsoft.insights/datacollectionrules"
  | where tags.instanceName =~ '${instanceName}'
  | where properties.dataSources.performanceCounters has 'VmInsights'
     or name contains 'VMI'
     or name contains 'vminsights'
     or tags.MonitorStarterPacks =~ 'VMI'
  | project ruleId=id, dcrName=name
) on ruleId
| project dcrName, resourceId, resourceName=tostring(split(resourceId,'/')[8])
`;

/** VMInsights — DCRs with server counts */
export const argVMInsightsDCRs = (instanceName: string) => `
resources
| where type == "microsoft.insights/datacollectionrules"
| where tags.instanceName =~ '${instanceName}'
| where properties.dataSources.performanceCounters has 'VmInsights'
   or name contains 'VMI'
   or name contains 'vminsights'
   or tags.MonitorStarterPacks =~ 'VMI'
| project dcrId=id, dcrName=name, location
| join kind=leftouter (
  insightsresources
  | where type == "microsoft.insights/datacollectionruleassociations"
  | extend resourceId=tostring(split(id,'/providers/Microsoft.Insights/')[0])
  | where isnotnull(properties.dataCollectionRuleId)
  | project dcrId=tostring(properties.dataCollectionRuleId), resourceId
) on dcrId
| summarize ServerCount=countif(isnotempty(resourceId)) by dcrId, dcrName, location
`;

// ── Agents tab ──

/** Comprehensive agent details — VM + Arc machines with AMA and Dependency Agent extension info */
export const argAgentDetails = (instanceName: string) => `
resources
| where type =~ 'microsoft.compute/virtualmachines'
| where tags.instanceName =~ '${instanceName}'
| extend vmId = toupper(id)
| project vmId, name, resourceGroup, subscriptionId, location,
    OS=tostring(properties.storageProfile.osDisk.osType),
    state=iff(properties.extended.instanceView.powerState.code=='PowerState/running','On','Off'),
    machineType='VM'
| join kind=leftouter (
    resources
    | where type =~ 'microsoft.compute/virtualmachines/extensions'
    | where name in~ ('AzureMonitorLinuxAgent','AzureMonitorWindowsAgent')
    | extend vmId = toupper(substring(id, 0, indexof(id, '/extensions')))
    | project vmId, AMAName=name,
        AMAStatus=tostring(properties.provisioningState),
        AMAVersion=tostring(properties.typeHandlerVersion),
        AutoUpgrade=tostring(properties.enableAutomaticUpgrade)
) on vmId
| join kind=leftouter (
    resources
    | where type =~ 'microsoft.compute/virtualmachines/extensions'
    | where name in~ ('DependencyAgentWindows','DependencyAgentLinux')
    | extend vmId = toupper(substring(id, 0, indexof(id, '/extensions')))
    | project vmId, DepAgent=name, DepAgentStatus=tostring(properties.provisioningState)
) on vmId
| union (
    resources
    | where type =~ 'microsoft.hybridcompute/machines'
    | where tags.instanceName =~ '${instanceName}'
    | extend vmId = toupper(id)
    | project vmId, name, resourceGroup, subscriptionId, location,
        OS=tostring(properties.osType),
        state=iff(properties.status=='Connected','On','Off'),
        machineType='Arc'
    | join kind=leftouter (
        resources
        | where type =~ 'microsoft.hybridcompute/machines/extensions'
        | where name in~ ('AzureMonitorLinuxAgent','AzureMonitorWindowsAgent')
        | extend vmId = toupper(substring(id, 0, indexof(id, '/extensions')))
        | project vmId, AMAName=name,
            AMAStatus=tostring(properties.provisioningState),
            AMAVersion=tostring(properties.typeHandlerVersion),
            AutoUpgrade=tostring(properties.enableAutomaticUpgrade)
    ) on vmId
    | join kind=leftouter (
        resources
        | where type =~ 'microsoft.hybridcompute/machines/extensions'
        | where name in~ ('DependencyAgentWindows','DependencyAgentLinux')
        | extend vmId = toupper(substring(id, 0, indexof(id, '/extensions')))
        | project vmId, DepAgent=name, DepAgentStatus=tostring(properties.provisioningState)
    ) on vmId
)
| project id=tolower(vmId), name, resourceGroup, subscriptionId, location, OS, state, machineType,
    AMAStatus=iff(isempty(AMAName),'Not Installed',AMAStatus),
    AMAVersion=iff(isempty(AMAName),'',AMAVersion),
    AutoUpgrade=iff(isempty(AMAName),'',AutoUpgrade),
    DepAgentStatus=iff(isempty(DepAgent),'Not Installed',DepAgentStatus)
| sort by name asc
`;

/** VM Application instances (gallery applications installed on VMs) */
export const argVMApplications = (instanceName: string) => `
resources
| where type =~ 'microsoft.compute/virtualmachines'
| where tags.instanceName =~ '${instanceName}'
| where isnotempty(properties.applicationProfile)
| mv-expand app = properties.applicationProfile.galleryApplications
| extend appId = tostring(app.packageReferenceId)
| project name, resourceGroup, location,
    appName=tostring(split(appId, '/')[10]),
    appVersion=tostring(split(appId, '/')[12]),
    gallery=tostring(split(appId, '/')[8])
`;

/** Discovery tagged VMs (WinDisc/LxDisc) — machines with discovery packs */
export const argDiscoveryTaggedVMs = (instanceName: string) => `
resources
| where type =~ 'microsoft.hybridcompute/machines'
| where tags.instanceName =~ '${instanceName}'
| where tags.MonitorStarterPacks has 'WinDisc' or tags.MonitorStarterPacks has 'LxDisc'
| project id, name, resourceGroup,
    OS=tostring(properties.osType),
    Packs=tostring(tags.MonitorStarterPacks), location, subscriptionId,
    state=iff(properties.status=='Connected','On','Off')
| union (
    resources
    | where type =~ 'microsoft.compute/virtualmachines'
    | where tags.instanceName =~ '${instanceName}'
    | where tags.MonitorStarterPacks has 'WinDisc' or tags.MonitorStarterPacks has 'LxDisc'
    | project id, name, resourceGroup,
        OS=tostring(properties.storageProfile.osDisk.osType),
        Packs=tostring(tags.MonitorStarterPacks), location, subscriptionId,
        state=iff(properties.extended.instanceView.powerState.code=='PowerState/running','On','Off')
)
`;

/** Non-tagged VMs for discovery — machines without any MonitorStarterPacks tag */
export const argDiscoveryNonTaggedVMs = (_instanceName: string) => `
resources
| where type =~ 'microsoft.hybridcompute/machines'
| where isempty(tags.MonitorStarterPacks)
| project id, name, resourceGroup,
    OS=tostring(properties.osType),
    location, subscriptionId,
    state=iff(properties.status=='Connected','On','Off')
| union (
    resources
    | where type =~ 'microsoft.compute/virtualmachines'
    | where isempty(tags.MonitorStarterPacks)
    | project id, name, resourceGroup,
        OS=tostring(properties.storageProfile.osDisk.osType),
        location, subscriptionId,
        state=iff(properties.extended.instanceView.powerState.code=='PowerState/running','On','Off')
)
`;

/** Non-monitored VMs (for agent install — those without AMA) */
export const ARG_NON_MONITORED_VMS_FOR_AGENT = `
resources
| where type =~ 'microsoft.compute/virtualmachines'
| extend vmId = toupper(id)
| join kind=leftanti (
    resources
    | where type =~ 'microsoft.compute/virtualmachines/extensions'
    | where name in~ ('AzureMonitorLinuxAgent','AzureMonitorWindowsAgent')
    | extend vmId = toupper(substring(id, 0, indexof(id, '/extensions')))
) on vmId
| project id, name, resourceGroup,
    OS=tostring(properties.storageProfile.osDisk.osType), location, subscriptionId
| union (
    resources
    | where type =~ 'microsoft.hybridcompute/machines'
    | extend vmId = toupper(id)
    | join kind=leftanti (
        resources
        | where type =~ 'microsoft.hybridcompute/machines/extensions'
        | where name in~ ('AzureMonitorLinuxAgent','AzureMonitorWindowsAgent')
        | extend vmId = toupper(substring(id, 0, indexof(id, '/extensions')))
    ) on vmId
    | project id, name, resourceGroup,
        OS=tostring(properties.osType), location, subscriptionId
)
`;

// ── Servers tab ──

/** Non-monitored machines (no MonitorStarterPacks tag or only discovery) */
export const ARG_NON_MONITORED_VMS = `
resources | where type =~ 'microsoft.hybridcompute/machines' | where isempty(tolower(tags.MonitorStarterPacks))
| project Resource=id,['Resource Group']=resourceGroup, OS=properties.osType, subscriptionId, Location=location, MP=tolower(tags.MonitorStarterPacks),state=iff(properties.status =='Connected','On','Off')
| where isempty(MP) or MP =~ 'LxDisc' or MP =~ 'WinDisc'
| union (resources | where type =~ 'microsoft.compute/virtualmachines'
| project Resource=id,['Resource Group']=resourceGroup, OS=properties.storageProfile.osDisk.osType, subscriptionId, Location=location,MP=tolower(tags.MonitorStarterPacks),state=iff(properties.extended.instanceView.powerState.code =='PowerState/running','On','Off')
| where isempty(MP) or MP =~ 'LxDisc' or MP =~ 'WinDisc')
| union (resources | where type =~ 'microsoft.compute/virtualmachinescalesets' and properties.orchestrationMode == 'Uniform'
| where isempty(tolower(tags.MonitorStarterPacks))
| project Resource=id,['Resource Group']=resourceGroup, OS=properties.virtualMachineProfile.storageProfile.osDisk.osType, subscriptionId, Location=location,MP=tolower(tags.MonitorStarterPacks)
| where isempty(MP) or MP =~ 'LxDisc' or MP =~ 'WinDisc')
| project-away MP
`;
