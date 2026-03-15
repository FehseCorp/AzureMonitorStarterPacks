param location string
param azureMonitorWorkspaceId string
param Tags object
param ruleName string

var amwFriendlyName = split(azureMonitorWorkspaceId, '/')[8]

resource otelDCR 'Microsoft.Insights/dataCollectionRules@2024-03-11' = {
  name: ruleName
  location: location
  tags: Tags
  properties: {
    description: 'Data collection rule for OpenTelemetry VM performance metrics.'
    dataSources: {
      performanceCountersOTel: [
        {
          name: 'OtelDataSource'
          streams: [
            'Microsoft-OtelPerfMetrics'
          ]
          samplingFrequencyInSeconds: 60
          counterSpecifiers: [
            'system.filesystem.usage'
            'system.disk.io'
            'system.disk.operation_time'
            'system.disk.operations'
            'system.memory.usage'
            'system.network.io'
            'system.cpu.time'
            'system.network.dropped'
            'system.network.errors'
            'system.uptime'
          ]
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
          'Microsoft-OtelPerfMetrics'
        ]
        destinations: [
          amwFriendlyName
        ]
      }
    ]
  }
}

output otelDCRId string = otelDCR.id
