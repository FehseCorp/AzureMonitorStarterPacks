param location string
param workspaceId string
param AGId string
param packtag string
param Tags object
param instanceName string
var moduleprefix = 'AMP-${instanceName}-${packtag}'

// Alert list
var alertlist = [
  {
    alertRuleDescription: 'An attempt to disable connection security failed'
    alertRuleDisplayName: 'An attempt to disable connection security failed'
    alertRuleName: 'AlertRule-Windows-Cluster-2016-1'
    alertRuleSeverity: 1
    autoMitigate: true
    evaluationFrequency: 'PT15M'
    windowSize: 'PT15M'
    alertType: 'rows'
    query: 'Event | where  EventID in (1583) and EventLog == \'System\' and Source == \'Microsoft-Windows-FailoverClustering\''
  } 
  {
    alertRuleDescription: 'Cluster network name resource failed to register dynamic updates'
    alertRuleDisplayName: 'Cluster network name resource failed to register dynamic updates'
    alertRuleName: 'AlertRule-Windows-Cluster-2016-2'
    alertRuleSeverity: 1
    autoMitigate: true
    evaluationFrequency: 'PT15M'
    windowSize: 'PT15M'
    alertType: 'rows'
    query: 'Event | where  EventID in (1578) and EventLog == \'System\' and Source == \'Microsoft-Windows-FailoverClustering\''
  }
  {
    alertRuleDescription: 'Cluster network name resource failed to register in secure DNS zone because record was already registered and owned'
    alertRuleDisplayName: 'Cluster network name resource failed to register in secure DNS zone because record was already registered and owned'
    alertRuleName: 'AlertRule-Windows-Cluster-2016-3'
    alertRuleSeverity: 1
    autoMitigate: true
    evaluationFrequency: 'PT15M'
    windowSize: 'PT15M'
    alertType: 'rows'
    query: 'Event | where  EventID in (1576) and EventLog == \'System\' and Source == \'Microsoft-Windows-FailoverClustering\''
  }    
  {
    alertRuleDescription: 'Cluster network name resource failed to register in secure DNS zone because registration was refused'
    alertRuleDisplayName: 'Cluster network name resource failed to register in secure DNS zone because registration was refused'
    alertRuleName: 'AlertRule-Windows-Cluster-2016-4'
    alertRuleSeverity: 2
    autoMitigate: true
    evaluationFrequency: 'PT15M'
    windowSize: 'PT15M'
    alertType: 'rows'
    query: 'Event | where  EventID in (1580) and EventLog == \'System\' and Source == \'Microsoft-Windows-FailoverClustering\''
  }    
  {
    alertRuleDescription: 'Cluster network name resource failed to update DNS A record'
    alertRuleDisplayName: 'Cluster network name resource failed to update DNS A record'
    alertRuleName: 'AlertRule-Windows-Cluster-2016-5'
    alertRuleSeverity: 1
    autoMitigate: true
    evaluationFrequency: 'PT15M'
    windowSize: 'PT15M'
    alertType: 'rows'
    query: 'Event | where  EventID in (1579) and EventLog == \'System\' and Source == \'Microsoft-Windows-FailoverClustering\''
  }
  {
    alertRuleDescription: 'cluster service has determined that this node does not have the latest copy of cluster configuration data'
    alertRuleDisplayName: 'cluster service has determined that this node does not have the latest copy of cluster configuration data'
    alertRuleName: 'AlertRule-Windows-Cluster-2016-6'
    alertRuleSeverity: 1
    autoMitigate: true
    evaluationFrequency: 'PT15M'
    windowSize: 'PT15M'
    alertType: 'rows'
    query: 'Event | where  EventID in (1561) and EventLog == \'System\' and Source == \'Microsoft-Windows-FailoverClustering\''
  }    
]

module alertsnew '../../../modules/alerts/alerts.bicep' = {
  name: '${moduleprefix}-Alerts'
  params: {
    alertlist: alertlist
    AGId: AGId
    location: location
    moduleprefix: moduleprefix
    packtag: packtag
    Tags: Tags
    workspaceId: workspaceId
  }
}


