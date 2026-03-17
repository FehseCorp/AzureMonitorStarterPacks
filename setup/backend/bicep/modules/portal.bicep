@description('Name for the portal Web App')
param portalName string
param location string
param Tags object
param functionAppUrl string
param functionAppResourceId string
param functionAppName string
param lawResourceId string
param appInsightsId string
param appInsightsName string
param azureMonitorWorkspaceId string = ''
param userManagedIdentity string
param userManagedIdentityPrincipalId string
param portalPackageUrl string
param instanceName string

var lawName = last(split(lawResourceId, '/'))
var amwName = azureMonitorWorkspaceId != '' ? last(split(azureMonitorWorkspaceId, '/')) : ''

// Microsoft Graph provider for app registration
extension microsoftGraphV1_0

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
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: portalPlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appCommandLine: 'cat > /home/site/wwwroot/config.json <<EOF\n{"clientId":"$AZURE_CLIENT_ID","tenantId":"$AZURE_TENANT_ID","instanceName":"$INSTANCE_NAME","functionAppUrl":"$FUNCTION_APP_URL","functionAppResourceId":"$FUNCTION_APP_RESOURCE_ID","functionAppName":"$FUNCTION_APP_NAME","workspaceId":"$LAW_RESOURCE_ID","workspaceName":"$LAW_NAME","appInsightsId":"$APP_INSIGHTS_ID","appInsightsName":"$APP_INSIGHTS_NAME","azureMonitorWorkspaceId":"$AMW_ID","azureMonitorWorkspaceName":"$AMW_NAME"}\nEOF\npm2 serve /home/site/wwwroot --no-daemon --spa'
      minTlsVersion: '1.2'
      http20Enabled: true
      appSettings: [
        {
          name: 'INSTANCE_NAME'
          value: instanceName
        }
        {
          name: 'FUNCTION_APP_URL'
          value: functionAppUrl
        }
        {
          name: 'FUNCTION_APP_RESOURCE_ID'
          value: functionAppResourceId
        }
        {
          name: 'FUNCTION_APP_NAME'
          value: functionAppName
        }
        {
          name: 'LAW_RESOURCE_ID'
          value: lawResourceId
        }
        {
          name: 'LAW_NAME'
          value: lawName
        }
        {
          name: 'APP_INSIGHTS_ID'
          value: appInsightsId
        }
        {
          name: 'APP_INSIGHTS_NAME'
          value: appInsightsName
        }
        {
          name: 'AMW_ID'
          value: azureMonitorWorkspaceId
        }
        {
          name: 'AMW_NAME'
          value: amwName
        }
        {
          name: 'AZURE_TENANT_ID'
          value: tenant().tenantId
        }
      ]
    }
  }
}

// Website Contributor role so the deployment script identity can deploy the app code
resource portalWebsiteContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(portalSite.id, userManagedIdentityPrincipalId, 'de139f84-1756-47ae-9be6-808fbbe84772')
  scope: portalSite
  properties: {
    principalId: userManagedIdentityPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'de139f84-1756-47ae-9be6-808fbbe84772')
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
  dependsOn: [
    portalWebsiteContributor
  ]
}

output portalUrl string = 'https://${portalSite.properties.defaultHostName}'
output portalName string = portalSite.name

// --- Entra app registration for the portal SPA (via Microsoft Graph Bicep) ---
resource portalAppRegistration 'Microsoft.Graph/applications@v1.0' = {
  displayName: '${portalName}-SPA'
  uniqueName: '${portalName}-SPA'
  signInAudience: 'AzureADMyOrg'
  spa: {
    redirectUris: [
      'https://${portalSite.properties.defaultHostName}'
      'http://localhost:5174'
    ]
  }
  requiredResourceAccess: [
    {
      // Azure Service Management — user_impersonation
      resourceAppId: '797f4846-ba00-4fd7-ba43-dac1f8f63013'
      resourceAccess: [
        {
          id: '41094075-9dad-400e-a0bd-54e686782033'
          type: 'Scope'
        }
      ]
    }
    {
      // Log Analytics API — Data.Read
      resourceAppId: 'ca7f3f0b-7d91-482c-8e09-c5d840d0eac5'
      resourceAccess: [
        {
          id: 'e4aa47b9-9a69-4109-82ed-36ec70d85571'
          type: 'Scope'
        }
      ]
    }
  ]
}

// Inject the auto-created client ID into the portal web app settings
resource portalEntraSettings 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  name: 'deployscript-PortalEntraSettings-${instanceName}-${location}'
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
    timeout: 'PT5M'
    retentionInterval: 'PT1H'
    environmentVariables: [
      {
        name: 'RESOURCE_GROUP'
        value: resourceGroup().name
      }
      {
        name: 'WEBAPP_NAME'
        value: portalSite.name
      }
      {
        name: 'CLIENT_ID'
        value: portalAppRegistration.appId
      }
    ]
    scriptContent: 'az webapp config appsettings set --resource-group "$RESOURCE_GROUP" --name "$WEBAPP_NAME" --settings AZURE_CLIENT_ID="$CLIENT_ID" --output none && echo "AZURE_CLIENT_ID set to $CLIENT_ID"'
  }
  dependsOn: [
    deployPortalScript
    portalWebsiteContributor
  ]
}
