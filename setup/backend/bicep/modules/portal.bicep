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
      appCommandLine: 'pm2 serve /home/site/wwwroot --no-daemon --spa'
      minTlsVersion: '1.2'
      http20Enabled: true
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
      {
        name: 'AZURE_CLIENT_ID'
        value: ''
      }
      {
        name: 'AZURE_TENANT_ID'
        value: tenant().tenantId
      }
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
    ]
    scriptContent: '''
      # Deploy the portal zip
      curl -sL "$PACKAGE_URL" -o portal.zip
      az webapp deployment source config-zip --resource-group "$RESOURCE_GROUP" --name "$WEBAPP_NAME" --src portal.zip

      # Build config.json with deployment-time values
      printf '{"clientId":"%s","tenantId":"%s","instanceName":"%s","functionAppUrl":"%s","functionAppResourceId":"%s","functionAppName":"%s","workspaceId":"%s","workspaceName":"%s","appInsightsId":"%s","appInsightsName":"%s","azureMonitorWorkspaceId":"%s","azureMonitorWorkspaceName":"%s"}' \
        "$AZURE_CLIENT_ID" "$AZURE_TENANT_ID" "$INSTANCE_NAME" \
        "$FUNCTION_APP_URL" "$FUNCTION_APP_RESOURCE_ID" "$FUNCTION_APP_NAME" \
        "$LAW_RESOURCE_ID" "$LAW_NAME" \
        "$APP_INSIGHTS_ID" "$APP_INSIGHTS_NAME" \
        "$AMW_ID" "$AMW_NAME" > config.json

      # Upload config.json to the app via Kudu VFS API
      KUDU_URL="https://${WEBAPP_NAME}.scm.azurewebsites.net"
      TOKEN=$(az account get-access-token --resource "https://${WEBAPP_NAME}.scm.azurewebsites.net" --query accessToken -o tsv 2>/dev/null || az account get-access-token --query accessToken -o tsv)
      curl -sS -X PUT "${KUDU_URL}/api/vfs/site/wwwroot/config.json" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "If-Match: *" \
        -H "Content-Type: application/json" \
        --data-binary @config.json

      echo "config.json deployed to ${WEBAPP_NAME}"
    '''
  }
  dependsOn: [
    portalWebsiteContributor
  ]
}

output portalUrl string = 'https://${portalSite.properties.defaultHostName}'
output portalName string = portalSite.name

// --- Entra app registration for the portal SPA ---
// Attempts to create/update an app registration via az ad commands.
// Requires the managed identity to have Application Developer directory role
// or Application.ReadWrite.OwnedBy Graph permission.
// If the identity lacks permission, the script succeeds with a warning and
// AZURE_CLIENT_ID is left empty — the portal shows a setup message.
resource portalEntraSettings 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  name: 'deployscript-PortalEntra-${instanceName}-${location}'
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
        name: 'APP_NAME'
        value: '${portalName}-SPA'
      }
      {
        name: 'REDIRECT_URI'
        value: 'https://${portalSite.properties.defaultHostName}'
      }
      {
        name: 'RESOURCE_GROUP'
        value: resourceGroup().name
      }
      {
        name: 'WEBAPP_NAME'
        value: portalSite.name
      }
    ]
    scriptContent: '''
      set +e
      # Look for existing app registration
      CLIENT_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv 2>/dev/null)

      if [ -z "$CLIENT_ID" ]; then
        # Try to create a new app registration
        CLIENT_ID=$(az ad app create \
          --display-name "$APP_NAME" \
          --sign-in-audience AzureADMyOrg \
          --enable-id-token-issuance false \
          --enable-access-token-issuance false \
          --query appId -o tsv 2>/dev/null)

        if [ -z "$CLIENT_ID" ]; then
          echo "WARNING: Could not create app registration '$APP_NAME'."
          echo "Grant the deployment identity the 'Application Developer' Entra directory role,"
          echo "or create the app registration manually and set AZURE_CLIENT_ID on the portal App Service."
          exit 0
        fi
        echo "Created app registration: $CLIENT_ID"
      else
        echo "Found existing app registration: $CLIENT_ID"
      fi

      # Configure SPA redirect URIs
      az ad app update --id "$CLIENT_ID" \
        --spa-redirect-uris "$REDIRECT_URI" "http://localhost:5174" 2>/dev/null || true

      # Add required API permissions (Azure Service Management + Log Analytics)
      # Azure Service Management — user_impersonation
      az ad app permission add --id "$CLIENT_ID" \
        --api 797f4846-ba00-4fd7-ba43-dac1f8f63013 \
        --api-permissions 41094075-9dad-400e-a0bd-54e686782033=Scope 2>/dev/null || true
      # Log Analytics API — Data.Read
      az ad app permission add --id "$CLIENT_ID" \
        --api ca7f3f0b-7d91-482c-8e09-c5d840d0eac5 \
        --api-permissions e4aa47b9-9a69-4109-82ed-36ec70d85571=Scope 2>/dev/null || true

      # Set AZURE_CLIENT_ID on the portal App Service
      az webapp config appsettings set \
        --resource-group "$RESOURCE_GROUP" --name "$WEBAPP_NAME" \
        --settings AZURE_CLIENT_ID="$CLIENT_ID" --output none

      echo "AZURE_CLIENT_ID set to $CLIENT_ID"
    '''
  }
  dependsOn: [
    deployPortalScript
    portalWebsiteContributor
  ]
}
