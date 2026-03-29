@allowed([
  'rows'
  'Aggregated'
  'metricOtel'
])
param alertType string
param alertRuleName string
param alertRuleDisplayName string
param alertRuleDescription string
param lawWorkSpaceId string ='' // log analytics workspace resource id
param AMWorkspaceId string ='' // Azure Monitor workspace resource id, only needed for vmMetricAlertToTel type
param actionGroupResourceId string
param alertRuleSeverity int
param location string
param windowSize string = 'PT15M'
param evaluationFrequency string = 'PT15M'
param autoMitigate bool = false
param query string
//param starterPackName string
//param packtag string
param Tags object
param metricName string = '' // Only needed for metricOtel type

param threshold int = 0
param metricMeasureColumn string = ''
param dimensions array = [{
  name: 'Computer'
  operator: 'Include'
  values: [
    '*'
  ]
}]
param FunctionUserManagedIdentity string = '' // Only needed if the alert query needs to run with a user managed identity, e.g. for metricOtel type

@allowed([
  'GreaterThan'
  'GreaterThanOrEqual'
  'LessThan'
  'LessThanOrEqual'
  'Equal'
  'NotEqual'
])
param operator string = 'GreaterThan'

module rowAlert './scheduledqueryruleRows.bicep' = if (alertType == 'rows') {
  name: alertRuleName
  params: {
    alertRuleName: alertRuleName
    alertRuleDisplayName: alertRuleDisplayName
    alertRuleDescription: alertRuleDescription
    scope: lawWorkSpaceId
    dimensions: dimensions
    actionGroupResourceId: actionGroupResourceId
    alertRuleSeverity: alertRuleSeverity
    location: location
    windowSize: windowSize
    evaluationFrequency: evaluationFrequency
    autoMitigate: autoMitigate
    query: query
    //starterPackName: starterPackName
    //packtag: packtag
    Tags: Tags
  }
}

module aggregateAlert './scheduledqueryruleAggregate.bicep' = if (alertType == 'Aggregated') {
  name: alertRuleName
  params: {
    alertRuleName: alertRuleName
    alertRuleDisplayName: alertRuleDisplayName
    alertRuleDescription: alertRuleDescription
    scope: lawWorkSpaceId
    dimensions: dimensions
    actionGroupResourceId: actionGroupResourceId
    alertRuleSeverity: alertRuleSeverity
    location: location
    windowSize: windowSize
    evaluationFrequency: evaluationFrequency
    autoMitigate: autoMitigate
    query: query
    //starterPackName: starterPackName
    //packtag: packtag
    Tags: Tags
    threshold: threshold
    metricMeasureColumn: metricMeasureColumn
    operator: operator
  }
}

module vmMetricAlertToTel './vmmetricalertotel.bicep' = if (alertType == 'metricOtel') {
  name: alertRuleName
  params: {
    alertrulename: alertRuleName
    location: location
    AMWorkspaceId: AMWorkspaceId
    metricName: metricName
    query: query
    Tags: Tags
    severity: alertRuleSeverity
    actionGroupId: actionGroupResourceId
    autoMitigate: autoMitigate
    FunctionUserManagedIdentity: FunctionUserManagedIdentity
  }
}
