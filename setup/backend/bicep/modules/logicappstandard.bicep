param location string
param appInsightsId string
param instanceName string
param keyvaultName string

module serverFarm 'br/public:avm/res/web/serverfarm:0.4.1' = {
  name: 'appfarm-logicapp01-${uniqueString(deployment().name, location)}'
  params: {
    name: 'appfarm-logicapp01'
    kind: 'elastic'
    maximumElasticWorkerCount: 3
    skuName: 'WS1'
  }
}
module mgmtIdentity 'br/public:avm/res/managed-identity/user-assigned-identity:0.4.0' = {
  name: 'mgmtidentity-${uniqueString(deployment().name, location)}'
  params: {
    name: 'AMP-${instanceName}-UMI-LogicApp'
  }
}
module logicapp 'br/public:avm/res/web/site:0.15.1' = {
  name: 'las-logicapp01-${uniqueString(deployment().name, location)}'
  params: {
    name: 'las-webshop01'
    kind: 'functionapp,workflowapp'
    serverFarmResourceId: serverFarm.outputs.resourceId
    appInsightResourceId: appInsightsId
    siteConfig: {
      alwaysOn: true
      netFrameworkVersion: 'v8.0'
    }
    managedIdentities: {
    userAssignedResourceIds: [
      mgmtIdentity.outputs.resourceId
      ]
    }
    keyVaultAccessIdentityResourceId: mgmtIdentity.outputs.resourceId
    appSettingsKeyValuePairs: {
      FUNCTIONS_EXTENSION_VERSION: '~4'
      FUNCTIONS_WORKER_RUNTIME: 'dotnet'
      WEBSITE_CONTENTSHARE: 'las-logicapp01'
      APP_KIND: 'workflowApp'
      WEBSITE_CONTENTAZUREFILECONNECTIONSTRING: '@Microsoft.KeyVault(VaultName=${keyvaultName};SecretName=stologicapp01-connectionstring)'
    }
  }
}
