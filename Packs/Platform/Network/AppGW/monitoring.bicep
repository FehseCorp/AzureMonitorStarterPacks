targetScope = 'managementGroup'
param workspaceId string
param packtag string
param solutionTag string
param actionGroupResourceId string
param instanceName string

var resourceTypes = [
  'Microsoft.Network/applicationGateways'
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
    name: 'AMP - App Gateway Diagnostics'
  }
}

module AppGW './alerts.bicep' = {
  name: 'AppGWAlerts'
  params: {
    assignmentLevel: assignmentLevel
    mgname: mgname
    solutionTag: solutionTag
    subscriptionId: subscriptionId
    userManagedIdentityResourceId: userManagedIdentityResourceId
    packTag: packtag
    instanceName: instanceName
    solutionVersion: solutionVersion
    AGId: actionGroupResourceId
    policyLocation: location
    parResourceGroupName: resourceGroupId
    resourceType: 'Microsoft.Network/applicationGateways'
  }
}
