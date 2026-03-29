targetScope = 'subscription'

param subscriptionId string //1
param resourceGroupName string //2
param createNewResourceGroup bool = false //3
param location string //4
param newLogAnalyticsWSName string = '' //5
param createNewLogAnalyticsWS bool //6
param existingLogAnalyticsWSId string = ''
//param currentUserIdObject string // This is to automatically assign permissions to Grafana.
//param functionName string
param storageAccountName string
param createNewStorageAccount bool = false
param instanceName string
// Packs` stuff
param customerTags object
// param deployAllPacks bool
// param deployIaaSPacks bool = false
param collectTelemetry bool = true
param appInsightsLocation string
param newAzureMonitorWSName string = ''
param createNewAzureMonitorWS bool = false
param existingAzureMonitorWSId string = ''
param deployPortal bool = true
@description('URL to the portal.zip package (e.g. GitHub Release URL). Required when deployPortal is true.')
param portalPackageUrl string = 'https://github.com/FehseCorp/AzureMonitorStarterPacks/raw/refs/heads/createPortal/setup/backend/portal.zip'

//var deployPacks = deployAllPacks || deployIaaSPacks //|| deployPaaSPacks || deployPlatformPacks
var solutionTag='MonitorStarterPacks'
var solutionTagComponents='MonitorStarterPacksComponents'
var solutionVersion='4.0'

var tempTags={'${solutionTagComponents}': 'BackendComponent'
solutionVersion: solutionVersion
instanceName: instanceName}
var Tags = (customerTags=={}) ? tempTags : union(tempTags,customerTags.All)
var functionName = 'AMP-${instanceName}-${split(subscriptionId,'-')[0]}-Function'
var ImageGalleryName = 'AMP${instanceName}Gallery'
var portalName = 'AMP-${instanceName}-${split(subscriptionId,'-')[0]}-Portal'

module resourgeGroup './backend/bicep/modules/mg/resourceGroup.bicep' = if (createNewResourceGroup) {
  name: 'RGMonitoringPacks-${location}-${instanceName}'
  scope: subscription(subscriptionId)
  params: {
    resourceGroupName: resourceGroupName
    location: location
    Tags: Tags
  }
}

module storageAccount './backend/bicep/modules/mg/storageAccount.bicep' = if (createNewStorageAccount) {
  name:'STOmonitoringPacks-${location}-${instanceName}'

  scope: resourceGroup(subscriptionId, resourceGroupName)
  dependsOn: [
    resourgeGroup
  ]
  params: {
    location: location
    Tags: Tags
    storageAccountName: storageAccountName
  }
}
module existingStorageAccount './backend/bicep/modules/mg/storageAccountBlobs.bicep' = if (!createNewStorageAccount) {
  name:'existingstorage-depl-${location}-${instanceName}'
  scope: resourceGroup(subscriptionId, resourceGroupName)
  params: {
    storageAccountName: storageAccountName
  }
}

module logAnalytics './backend/bicep/modules/LAW/law.bicep' = if (createNewLogAnalyticsWS) {
  name: 'logAnalytics-Deployment-${location}-${instanceName}'
  scope: resourceGroup(subscriptionId, resourceGroupName)
  dependsOn: [
    resourgeGroup
  ]
  params: {
    location: location
    logAnalyticsWorkspaceName: newLogAnalyticsWSName
    Tags: Tags
    //createNewLogAnalyticsWS: createNewLogAnalyticsWS
  }
}

module azureMonitorWorkspace './backend/bicep/modules/LAW/amw.bicep' = if (createNewAzureMonitorWS) {
  name: 'azureMonitorWorkspace-${location}-${instanceName}'
  scope: resourceGroup(subscriptionId, resourceGroupName)
  dependsOn: [
    resourgeGroup
  ]
  params: {
    location: location
    azureMonitorWorkspaceName: newAzureMonitorWSName
    Tags: Tags
  }
}

module discovery './discovery/discovery.bicep' = {
  name: 'DeployDiscovery-${location}-${instanceName}'
  // dependsOn: [
  //  backend
  // ]
  params: {
    location: location
    resourceGroupName: resourceGroupName
    solutionTag: solutionTag
    //solutionVersion: solutionVersion
    subscriptionId: subscriptionId
    dceId: backend.outputs.dceId
    imageGalleryName: ImageGalleryName
    lawResourceId: createNewLogAnalyticsWS ? logAnalytics.outputs.lawresourceid : existingLogAnalyticsWSId
    storageAccountname: storageAccountName
    tableName: 'Discovery' // to store discovery data, no the results of the discovery
    resultstableName: 'DiscoveryResults' // to store the results of the discovery
    //userManagedIdentityResourceId: backend.outputs.packsUserManagedResourceId
    customerTags: customerTags
    instanceName: instanceName
    solutionVersion: solutionVersion
    functionName: functionName
    UserManagedIdentityId: backend.outputs.functionUserManagedIdentityId
  }
}

module backend './backend/bicep/backend.bicep' = {
  name: 'MonitoringPacks-backend-${instanceName}'
  dependsOn: [
    resourgeGroup
    storageAccount
  ]
  params: {
    appInsightsLocation: appInsightsLocation
    functionname: functionName
    lawresourceid: createNewLogAnalyticsWS ? logAnalytics.outputs.lawresourceid : existingLogAnalyticsWSId
    location: location
    resourceGroupName: resourceGroupName
    Tags: Tags
    storageAccountName: storageAccountName
    subscriptionId: subscriptionId
    collectTelemetry: collectTelemetry
    createNewStorageAccount: createNewStorageAccount
    azureMonitorWorkspaceId: createNewAzureMonitorWS ? azureMonitorWorkspace.outputs.amwResourceId : existingAzureMonitorWSId
    deployPortal: deployPortal
    portalname: portalName
    portalPackageUrl: portalPackageUrl
    imageGalleryName: ImageGalleryName
    instanceName: instanceName
    solutionTag: solutionTag
  }
}

