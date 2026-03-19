param kvName string
param location string
param Tags object

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
output kvResourceId string = vault.id
