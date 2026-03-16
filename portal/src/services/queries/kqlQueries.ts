// KQL query constants — extracted from extendedwb.json workbook

/** Available IaaS packs — tag list for pack selector dropdown */
export const KQL_AVAILABLE_PACK_TAGS = `
AvailableIaaSPacks_CL
| summarize arg_max(TimeGenerated,*) by Tag
| project Tag
| where isnotempty(Tag)
`;

/** Available IaaS packs — full details */
export const KQL_AVAILABLE_IAAS_PACKS = `
AvailableIaaSPacks_CL
| project Tag_s, Name_s, NumberOfRules_s, NumberOfAlerts_s, AlertNames_s
`;

/** Supported PaaS services */
export const KQL_SUPPORTED_SERVICES = `
SupportedServices_CL
| project Category_s, ServiceNameSpace_s, ServiceName_s, MetricNameSpace_s, Tag_s, NumberOfMetrics_d
`;

/** Heartbeat — agent last seen */
export const KQL_HEARTBEAT = `
Heartbeat
| summarize LastHeartbeat=max(TimeGenerated) by Computer, OSType, RemoteIPCountry, ResourceId
| extend SecondsAgo=datetime_diff('second', now(), LastHeartbeat)
| project Computer, OSType, LastHeartbeat, SecondsAgo, RemoteIPCountry, ResourceId
| order by Computer asc
`;

/** Discovery results */
export const KQL_DISCOVERY_RESULTS = `
DiscoveryResults_CL
| order by TimeGenerated desc
`;

/** Monitored PaaS services */
export const KQL_MONITORED_PAAS = `
MonitoredPaaSTable_CL
| order by TimeGenerated desc
`;

/** Non-Monitored PaaS services */
export const KQL_NON_MONITORED_PAAS = `
NonMonitoredPaaSTable_CL
| order by TimeGenerated desc
`;

/** App Insights function invocations */
export const kqlFunctionInvocations = (timeRange = "24h") => `
requests
| where timestamp > ago(${timeRange})
| project timestamp, name, success, resultCode, duration, operation_Id
| order by timestamp desc
`;

/** App Insights trace details for an invocation */
export const kqlInvocationDetails = (operationId: string) => `
union traces, exceptions
| where operation_Id == '${operationId}'
| order by timestamp asc
| project timestamp, message=coalesce(message, outerMessage), severityLevel, itemType
`;
