param storageAccountName string
param location string
param Tags object
param usepeps bool = false
param subnetId string
param pepStorageZoneId string = ''

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  tags: Tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: true
    supportsHttpsTrafficOnly: true
  }
  resource blobServices 'blobServices'={
    name: 'default'
    properties: {
        cors: {
            corsRules: []
        }
        deleteRetentionPolicy: {
            enabled: false
        }
    }
    resource container1 'containers'={
      name: 'discovery'
      properties: {
        immutableStorageWithVersioning: {
            enabled: false
        }
        denyEncryptionScopeOverride: false
        defaultEncryptionScope: '$account-encryption-key'
        publicAccess: 'None'
      }
    }
    resource container2 'containers'={
      name: 'applications'
      properties: {
        immutableStorageWithVersioning: {
            enabled: false
        }
        denyEncryptionScopeOverride: false
        defaultEncryptionScope: '$account-encryption-key'
        publicAccess: 'None'
      }
    }
    resource container3 'containers'={
      name: 'amba'
      properties: {
        immutableStorageWithVersioning: {
            enabled: false
        }
        denyEncryptionScopeOverride: false
        defaultEncryptionScope: '$account-encryption-key'
        publicAccess: 'None'
      }
    }
  }
}
// Add private endpoint module connection if usepeps is true
module privateEndpoint 'br/public:avm/res/network/private-endpoint:0.10.1' = if (usepeps) {
  name: 'pepStorageAccount'
  scope: resourceGroup(subscription().subscriptionId, resourceGroup().name)
  params: {
    location: location
    name: '${storageAccountName}-pep'
    subnetResourceId: subnetId
    privateLinkServiceConnections: [
      {
        name: 'storageAccount'
        properties: {
          privateLinkServiceId: storageAccount.id
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
        {privateDnsZoneResourceId: pepStorageZoneId}
      ]
  }
  }
}

output storageAccountName string = storageAccount.name
output storageAccountResourceId string = storageAccount.id
