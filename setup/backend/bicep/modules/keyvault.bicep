param kvName string
param location string
param Tags object 
param functionName string
param usepeps bool = false
param subnetId string
param pepKeyvaultZoneId string = ''

//var vaultUri = 'https://${kvName}.vault.azure.net'


resource azfunctionsite 'Microsoft.Web/sites@2022-09-01' existing = {
  name: functionName
}

resource vault 'Microsoft.KeyVault/vaults@2024-12-01-preview' = {
  name: kvName
  location: location
  tags: Tags
  properties: {
    sku: {
      family: 'A'
      name:  'standard'
    }
    tenantId: subscription().tenantId

    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: false
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enableRbacAuthorization: true
    provisioningState: 'Succeeded'
    publicNetworkAccess: 'Enabled'
    enablePurgeProtection: true //CAF
  }
}
// Add secret from function
resource kvsecret1 'Microsoft.KeyVault/vaults/secrets@2021-11-01-preview' = {
  name: 'FunctionKey'
  tags: Tags
  parent: vault
  properties: {
    attributes: {
      enabled: true
    }
    contentType: 'string'
    value: listKeys(resourceId('Microsoft.Web/sites/host', azfunctionsite.name, 'default'), azfunctionsite.apiVersion).functionKeys.monitoringKey
  }
}

module privateEndpoint 'br/public:avm/res/network/private-endpoint:0.10.1' = if (usepeps) {
  name: 'pepStorageAccount'
  scope: resourceGroup(subscription().subscriptionId, resourceGroup().name)
  params: {
    location: location
    name: '${vault.name}-pep'
    subnetResourceId: subnetId
    privateLinkServiceConnections: [
      {
        name: 'storageAccount'
        properties: {
          privateLinkServiceId: vault.id
          groupIds: [
            'blob'
          ]
          requestMessage: 'Please approve my connection.'

        }
      }
    ]
    privateDnsZoneGroup: {
      name: 'pepStorageAccountPrivateDnsZoneGroup'
      privateDnsZoneGroupConfigs: [
        {privateDnsZoneResourceId: pepKeyvaultZoneId}
      ]
    }
  }
}
// module pep 'privateendpoint.bicep' = if (pepid != '') {
//   name: 'pep-${kvName}'
//   params: {
//     location: location
//     Tags: Tags
//     pepname: '${kvName}-pep'
//     serviceId: vault.id
//     subnetId: pepid
//     serviceName: 'keyvault'
//   }
// }

// resource kvPrivateLinkServiceConnection 'Microsoft.KeyVault/vaults/privateEndpointConnections@2023-05-01' = if (pepid != '') {
//   name: 'keyvault'
//   parent: vault
//   properties: {
//     privateLinkServiceConnectionState: {
//       status: 'Approved'
//       description: 'Private endpoint connection to key vault.'
//       actionsRequired: 'None'
//     }
//     privateEndpoint: {
//       id: pep.outputs.pepid
//     }
//   }
// }
output kvResourceId string = vault.id
