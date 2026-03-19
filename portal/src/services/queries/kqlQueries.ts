// KQL query constants — extracted from extendedwb.json workbook

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
