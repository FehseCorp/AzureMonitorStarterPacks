@description('Name for the portal Web App')
param portalName string
param location string
param Tags object
param functionAppUrl string
param userManagedIdentity string
param portalPackageUrl string
param instanceName string

// Separate B1 Linux plan for the portal
resource portalPlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${portalName}-plan'
  location: location
  tags: Tags
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource portalSite 'Microsoft.Web/sites@2024-04-01' = {
  name: portalName
  location: location
  kind: 'app,linux'
  tags: Tags
  properties: {
    serverFarmId: portalPlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appCommandLine: 'pm2 serve /home/site/wwwroot --no-daemon --spa'
      minTlsVersion: '1.2'
      http20Enabled: true
      appSettings: [
        {
          name: 'FUNCTION_APP_URL'
          value: functionAppUrl
        }
      ]
    }
  }
}

// Download portal.zip from the package URL and deploy it to the web app
resource deployPortalScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  name: 'deployscript-Portal-${instanceName}-${location}'
  tags: Tags
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userManagedIdentity}': {}
    }
  }
  kind: 'AzureCLI'
  properties: {
    azCliVersion: '2.42.0'
    timeout: 'PT10M'
    retentionInterval: 'PT1H'
    environmentVariables: [
      {
        name: 'PACKAGE_URL'
        value: portalPackageUrl
      }
      {
        name: 'WEBAPP_NAME'
        value: portalSite.name
      }
      {
        name: 'RESOURCE_GROUP'
        value: resourceGroup().name
      }
    ]
    scriptContent: 'curl -sL "$PACKAGE_URL" -o portal.zip && az webapp deploy --resource-group "$RESOURCE_GROUP" --name "$WEBAPP_NAME" --src-path portal.zip --type zip'
  }
}

output portalUrl string = 'https://${portalSite.properties.defaultHostName}'
output portalName string = portalSite.name
