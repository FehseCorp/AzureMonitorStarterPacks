param _artifactsLocation string
@secure()
param _artifactsLocationSasToken string
//param SAkvSecretName string
param appInsightsSecretName string
param functionname string
param location string
param Tags object
param userManagedIdentity string
param userManagedIdentityClientId string
param userManagedIdentityPrincipalId string
param packsUserManagedId string
param storageAccountName string
param filename string = 'discovery.zip'
//param sasExpiry string = dateTimeAdd(utcNow(), 'PT2H')
param lawresourceid string
param appInsightsLocation string
//param monitoringKeyName string
param keyVaultName string
param subscriptionId string
param resourceGroupName string

var discoveryContainerName = 'discovery'
var tempfilename = '${filename}.tmp'
//param apiManagementKey string= base64(newGuid())
param solutionTag string
param instanceName string

// var sasConfig = {
//   signedResourceTypes: 'sco'
//   signedPermission: 'r'
//   signedServices: 'b'
//   signedExpiry: sasExpiry
//   signedProtocol: 'https'
//   keyToSign: 'key2'
// }
resource discoveryStorage 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: storageAccountName
}
// resource deploymentScript 'Microsoft.Resources/deploymentScripts@2020-10-01' = {
//   name: 'deployscript-Function-${instanceName}'
//   dependsOn: [
//     azfunctionsiteconfig
//   ]
//   tags: Tags
//   location: location
//   kind: 'AzureCLI'
//   identity: {
//     type: 'UserAssigned'
//     userAssignedIdentities: {
//       '${userManagedIdentity}': {}
//     }
//   }
//   properties: {
//     azCliVersion: '2.42.0'
//     timeout: 'PT5M'
//     retentionInterval: 'PT1H'
//     environmentVariables: [
//       {
//         name: 'AZURE_STORAGE_ACCOUNT'
//         value: discoveryStorage.name
//       }
//       {
//         name: 'CONTENT'
//         value: loadFileAsBase64('../../backend.zip')
//       }
//     ]
//     //scriptContent: 'echo "$CONTENT" > ${tempfilename} && cat ${tempfilename} | base64 -d > ${filename} && ls && az storage blob upload -f ${filename} -c ${discoveryContainerName} -n ${filename} --auth-mode login --overwrite true --debug'
//     scriptContent: 'echo "$CONTENT" > ${tempfilename} && cat ${tempfilename} | base64 -d > ${filename} && az account set --subscription ${subscriptionId} && az functionapp deployment source config-zip --src ./${filename} -g ${resourceGroupName} -n ${functionname}'
//   }
// }

resource serverfarm 'Microsoft.Web/serverfarms@2021-03-01' = {
  name: '${functionname}-farm'
  location: location
  tags: Tags
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}
resource azfunctionsite 'Microsoft.Web/sites@2023-12-01' = {
  name: functionname
  location: location
  tags: Tags
  kind: 'functionapp,linux'
  identity: {
      type: 'SystemAssigned, UserAssigned'
      userAssignedIdentities: {
          '${userManagedIdentity}': {
          }
      }
  }  
  properties: {
    reserved: true
    httpsOnly: true
    serverFarmId: serverfarm.id
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${discoveryStorage.properties.primaryEndpoints.blob}${discoveryContainerName}'
          authentication: {
            type: 'SystemAssignedIdentity'
          }
        }
      }
      runtime: {
        name: 'powershell'
        version: '7.4'
      }
      scaleAndConcurrency: {
        instanceMemoryMB: 2048
        maximumInstanceCount: 40
      }
    }
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage__accountName'
          value: discoveryStorage.name
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
      ]
    }
  }
}
// resource azfunctionsite 'Microsoft.Web/sites@2023-12-01' = {
//   name: functionname
//   location: location
//   kind: 'functionapp,linux'
//   tags: Tags
//   identity: {
//       type: 'SystemAssigned, UserAssigned'
//       userAssignedIdentities: {
//           '${userManagedIdentity}': {}
//       }
//   }  
//   properties: {
//       enabled: true      
//       hostNameSslStates: [
//           {
//               name: '${functionname}.azurewebsites.net'
//               sslState: 'Disabled'
//               hostType: 'Standard'
//           }
//           {
//               name: '${functionname}.azurewebsites.net'
//               sslState: 'Disabled'
//               hostType: 'Repository'
//           }
//       ]
//       serverFarmId: serverfarm.id
//       reserved: false
//       isXenon: false
//       hyperV: false
//       functionAppConfig: {
//         deployment: {
//           storage: {
//             type: 'blobContainer'
//             value: '${discoveryStorage.properties.primaryEndpoints.blob}${discoveryContainerName}'
//             authentication: {
//               userAssignedIdentityResourceId: userManagedIdentity
//               type: 'UserAssignedIdentity'
//               storageAccountConnectionStringName: null
//             }
//           }
//         }
//         runtime: {
//           name: 'powershell'
//           version: '7.4'
//         }
//         scaleAndConcurrency: {
//           instanceMemoryMB: 2048
//           maximumInstanceCount: 40
//         }
//       }
//       siteConfig: {
//           numberOfWorkers: 1
//           acrUseManagedIdentityCreds: false
//           alwaysOn: false
//           ipSecurityRestrictions: [
//               {
//                   ipAddress: 'Any'
//                   action: 'Allow'
//                   priority: 1
//                   name: 'Allow all'
//                   description: 'Allow all access'
//               }
//           ]
//           scmIpSecurityRestrictions: [
//               {
//                   ipAddress: 'Any'
//                   action: 'Allow'
//                   priority: 1
//                   name: 'Allow all'
//                   description: 'Allow all access'
//               }
//           ]
//           http20Enabled: false
//           //functionAppScaleLimit: 200
//           minimumElasticInstanceCount: 0
//           minTlsVersion: '1.2'
//           cors: {
//               allowedOrigins: [
//                   'https://portal.azure.com'
//               ]
//               supportCredentials: true
//           }  
//       }
//       scmSiteAlsoStopped: false
//       clientAffinityEnabled: false
//       clientCertEnabled: false
//       clientCertMode: 'Required'
//       hostNamesDisabled: false
//       containerSize: 1536
//       dailyMemoryTimeQuota: 0
//       httpsOnly: true
//       redundancyMode: 'None'
//       storageAccountRequired: false
//       keyVaultReferenceIdentity: 'SystemAssigned'
//   }
// }
// var functionSystemAssignedIdentityRoles= [
//   '4633458b-17de-408a-b874-0445c86b69e6'   //keyvault reader role
// ]

// resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' =  [for (roledefinitionId, i) in functionSystemAssignedIdentityRoles:  {
//   name: guid('${functionname}-role-assignment-${i}',resourceGroup().name)
//   properties: {
//     description: '${functionname}-${functionSystemAssignedIdentityRoles[0]}'
//     principalId: azfunctionsite.identity.principalId
//     principalType: 'ServicePrincipal'
//     roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions',roledefinitionId)
//   }
// }]

resource azfunctionsiteconfig 'Microsoft.Web/sites/config@2021-03-01' = {
  name: 'appsettings'
  parent: azfunctionsite
  // dependsOn: [
  //   roleAssignment
  // ]
  properties: {
    AzureWebJobsStorage__accountName: discoveryStorage.name
    FUNCTIONS_EXTENSION_VERSION:'~4'
    ResourceGroup: resourceGroup().name
    SCM_DO_BUILD_DURING_DEPLOYMENT: 'true'
    SolutionTag: solutionTag
    APPINSIGHTS_INSTRUMENTATIONKEY: reference(appinsights.id, '2020-02-02-preview').InstrumentationKey
    APPLICATIONINSIGHTS_CONNECTION_STRING: 'InstrumentationKey=${reference(appinsights.id, '2020-02-02-preview').InstrumentationKey}'
    ApplicationInsightsAgent_EXTENSION_VERSION: '~2'
    MSI_CLIENT_ID: userManagedIdentityClientId
    PacksUserManagedId: packsUserManagedId
    ARTIFACS_LOCATION: _artifactsLocation
    ARTIFACTS_LOCATION_SAS_TOKEN: _artifactsLocationSasToken
  }
}
// resource deployfunctions 'Microsoft.Web/sites/extensions@2021-02-01' = {
//   parent: azfunctionsite
//   dependsOn: [
//     deploymentScript
//     azfunctionsiteconfig
//   ]
//   name: 'MSDeploy'

//   properties: {
//     packageUri: '${discoveryStorage.properties.primaryEndpoints.blob}${discoveryContainerName}/${filename}'

//   }
// }
resource appinsights 'Microsoft.Insights/components@2020-02-02' = {
  name: functionname
  tags: Tags
  location: appInsightsLocation
  kind: 'web'
  properties: {
    Application_Type: 'web'
    //ApplicationId: guid(functionname)
    //Flow_Type: 'Redfield'
    //Request_Source: 'IbizaAIExtension'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    WorkspaceResourceId: lawresourceid
  }
}

module kvSecretsAppInsights '../modules/keyvaultsecretAppInsights.bicep' = {
  name: 'kvSecretAppInsights'
  scope: resourceGroup(subscriptionId, resourceGroupName)
  params: {
    kvName: keyVaultName
    Tags: Tags
    appInsightsName: appinsights.name
    appInsightsSecretName: appInsightsSecretName
  }
}
// resource monitoringkey 'Microsoft.Web/sites/host/functionKeys@2022-03-01' = { 
//   dependsOn: [ 
//     azfunctionsiteconfig 
//   ]
//   tags: Tags
//   name: '${functionname}/default/${monitoringKeyName}'  
//   properties: {  
//     name: monitoringKeyName  
//     value: apiManagementKey
//   }  
// } 

