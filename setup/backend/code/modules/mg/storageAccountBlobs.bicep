param storageAccountName string

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing =  {
  name: storageAccountName

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
  }
}
output storageAccountName string = storageAccount.name
output storageAccountResourceId string = storageAccount.id
