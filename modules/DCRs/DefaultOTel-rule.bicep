param location string
param azureMonitorWorkspaceId string
param Tags object
param ruleName string
param dceId string

@allowed(['Linux', 'Windows', 'All'])
param kind string = 'All'

var amwFriendlyName = split(azureMonitorWorkspaceId, '/')[8]

resource otelDCR 'Microsoft.Insights/dataCollectionRules@2023-03-11' = {
  name: ruleName
  location: location
  tags: Tags
  kind: kind
  properties: {
    description: 'Data collection rule for OpenTelemetry Prometheus metrics.'
    dataCollectionEndpointId: dceId
    dataSources: {
      prometheusForwarder: [
        {
          name: 'PrometheusDataSource'
          streams: [
            'Microsoft-PrometheusMetrics'
          ]
          labelIncludeFilter: {}
        }
      ]
    }
    destinations: {
      monitoringAccounts: [
        {
          accountResourceId: azureMonitorWorkspaceId
          name: amwFriendlyName
        }
      ]
    }
    dataFlows: [
      {
        streams: [
          'Microsoft-PrometheusMetrics'
        ]
        destinations: [
          amwFriendlyName
        ]
      }
    ]
  }
}

output otelDCRId string = otelDCR.id
