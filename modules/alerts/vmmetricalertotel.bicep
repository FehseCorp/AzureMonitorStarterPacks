param alertrulename string
param location string = 'global'
//param vmId string
param metricName string
param query string
param Tags object
param severity int
param actionGroupId string
param autoMitigate bool
param AMWorkspaceId string // Azure Monitor workspace resource id, only needed for vmMetricAlertToTel type
param FunctionUserManagedIdentity string // Only needed if the alert query needs to run with a user managed identity, e.g. for metricOtel type

@allowed([
  'GreaterThan'
  'GreaterThanOrEqual'
  'LessThan'
  'LessThanOrEqual'
])
param operator string = 'GreaterThan'
@allowed([
  'PT1M'
  'PT5M'
  'PT15M'
  'PT30M'
  'PT1H'
])
param evaluationFrequency string = 'PT5M'
@allowed([
  'PT1M'
  'PT5M'
  'PT15M'
  'PT30M'
  'PT1H'
])
param windowSize string = 'PT5M'
resource metricalert 'Microsoft.Insights/metricAlerts@2024-03-01-preview' = {
  name: alertrulename
  location: location
  identity: {
      type: 'UserAssigned'
      userAssignedIdentities: {
          '${FunctionUserManagedIdentity}': {}
      }
  }
  tags: Tags
  properties: {
    scopes: [
      AMWorkspaceId
    ]

    actions: [
      {
        actionGroupId: actionGroupId
      }
    ]
    resolveConfiguration: {
      autoResolved: autoMitigate
    }
    severity: severity
    enabled: true
    evaluationFrequency: evaluationFrequency
    //windowSize: windowSize
    criteria: {
      allOf: [
        {
            name: metricName
            criterionType: 'StaticThresholdCriterion'
            query: query
        }
    ]
    'odata.type': 'Microsoft.Azure.Monitor.PromQLCriteria'
    }
  }
}
