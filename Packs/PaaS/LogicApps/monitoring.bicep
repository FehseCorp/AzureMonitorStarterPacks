targetScope = 'managementGroup'
param workspaceId string
param packtag string
param solutionTag string
param actionGroupResourceId string
param instanceName string

var resourceTypes = [
  'Microsoft.Logic/workflows'
]

param location string //= resourceGroup().location
param subscriptionId string
param userManagedIdentityResourceId string
param mgname string 
param assignmentLevel string
param resourceGroupId string
param solutionVersion string
param customerTags object 
var tempTags ={
  '${solutionTag}': packtag
  MonitoringPackType: 'Platform'
  solutionVersion: solutionVersion
}
// if the customer has provided tags, then use them, otherwise use the default tags
var Tags = (customerTags=={}) ? tempTags : union(tempTags,customerTags.All)
//var resourceShortType = split(resourceType, '/')[1]

var resourceGroupName = split(resourceGroupId, '/')[4]

module workbook 'workbook.bicep' = {
  name: '${packtag}-workbook'
  scope: resourceGroup(subscriptionId, resourceGroupName)
  params: {
    location: location
    Tags: Tags
    workspaceId: workspaceId
    name: 'AMP - Log Apps Dashboard'
  }
}

module LogicApps './alerts.bicep' = {
  name: 'LogicAppsAlerts'
  params: {
    assignmentLevel: assignmentLevel
    //location: location
    mgname: mgname
    //resourceGroupId: resourceGroupId
    solutionTag: solutionTag
    subscriptionId: subscriptionId
    //actionGroupResourceId: actionGroupResourceId
    userManagedIdentityResourceId: userManagedIdentityResourceId
    //workspaceId: workspaceId
    packTag: packtag
    //grafanaName: grafanaName
    //dceId: dceId
    //customerTags: customerTags
    instanceName: instanceName
    AGId: actionGroupResourceId
    policyLocation: location
    parResourceGroupName: resourceGroupId
    solutionVersion: solutionVersion
    resourceType: 'Microsoft.Logic/workflows'
  }
}
