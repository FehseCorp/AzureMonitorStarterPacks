targetScope = 'managementGroup'

param actionGroupResourceId string
@description('location for the deployment.')
param location string //= resourceGroup().location
@description('Full resource ID of the log analytics workspace to be used for the deployment.')
param workspaceId string
//@description('Full resource ID of the log analytics AVD workspace to be used for the deployment IF seperate.')
//param workspaceIdAVD string
param solutionTag string
param solutionVersion string
@description('Full resource ID of the data collection endpoint to be used for the deployment.')
param dceId string
@description('Full resource ID of the user managed identity to be used for the deployment')
param userManagedIdentityResourceId string
param mgname string // this the last part of the management group id
param subscriptionId string
param resourceGroupId string
param assignmentLevel string
//param grafanaName string
param customerTags object 
param instanceName string

module Storage './Storage/monitoring.bicep' = {
  name: 'StorageAlerts'
  params: {
    assignmentLevel: assignmentLevel
    location: location
    mgname: mgname
    resourceGroupId: resourceGroupId
    solutionTag: solutionTag
    subscriptionId: subscriptionId
    actionGroupResourceId: actionGroupResourceId
    userManagedIdentityResourceId: userManagedIdentityResourceId
    //workspaceId: workspaceId
    packtag: 'Storage'
    //grafanaName: grafanaName
    //dceId: dceId
    customerTags: customerTags
    instanceName: instanceName
    solutionVersion: solutionVersion
  }
}

module AVD './AVD/monitoring.bicep' = {
  name: 'AvdAlerts'
  params: {
    assignmentLevel: assignmentLevel
    customerTags: customerTags
    location: location
    mgname: mgname
    resourceGroupId: resourceGroupId
    solutionTag: solutionTag
    solutionVersion: solutionVersion
    subscriptionId: subscriptionId
    userManagedIdentityResourceId: userManagedIdentityResourceId
    packtag: 'Avd'
    //grafanaName: grafanaName
    instanceName: instanceName
    dceId: dceId
    workspaceId: workspaceId
  }
}

// No logs for this pack, so going straight to alerts
module LogicApps './LogicApps/monitoring.bicep' = {
  name: 'LogicAppsAlerts'
  params: {
    assignmentLevel: assignmentLevel
    location: location
    mgname: mgname
    //resourceGroupId: resourceGroupId
    solutionTag: solutionTag
    subscriptionId: subscriptionId
    //actionGroupResourceId: actionGroupResourceId
    userManagedIdentityResourceId: userManagedIdentityResourceId
    //workspaceId: workspaceId
    packtag: 'LogicApps'
    //grafanaName: grafanaName
    //dceId: dceId
    customerTags: customerTags
    instanceName: instanceName
    actionGroupResourceId: actionGroupResourceId
    resourceGroupId: resourceGroupId
    workspaceId: workspaceId  
    solutionVersion: solutionVersion
  }
}

// No logs for this pack, so going straight to alerts
module SQLMI './SQL/SQLMI/alerts.bicep' = {
  name: 'SQLMIAlerts'
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
    packTag: 'SQLMI'
    //grafanaName: grafanaName
    //dceId: dceId
    //customerTags: customerTags
    instanceName: instanceName
    solutionVersion: solutionVersion
    AGId: actionGroupResourceId
    policyLocation: location
    parResourceGroupName: resourceGroupId
    resourceType: 'Microsoft.Sql/managedInstances'
  }
}

module SQLSrv './SQL/server/alerts.bicep' = {                              
  name: 'SQLSrvAlerts'
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
    packTag: 'SQLSrv'
    //grafanaName: grafanaName
    //dceId: dceId
    //customerTags: customerTags
    instanceName: instanceName
    solutionVersion: solutionVersion
    AGId: actionGroupResourceId
    policyLocation: location
    parResourceGroupName: resourceGroupId
    resourceType: 'Microsoft.Sql/servers/databases'
  }
}

module WebApps './WebApp/monitoring.bicep' = {
  name: 'WebApps'
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
    packtag: 'WebApp'
    //grafanaName: grafanaName
    //dceId: dceId
    //customerTags: customerTags
    instanceName: instanceName
    solutionVersion: solutionVersion
    actionGroupResourceId: actionGroupResourceId
    customerTags: customerTags
    location: location
    resourceGroupId: resourceGroupId
    workspaceId: workspaceId
  }
}

module ADF './ADF/alerts.bicep' = {
  name: 'ADFAlerts'
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
    packTag: 'ADF'
    //grafanaName: grafanaName
    //dceId: dceId
    //customerTags: customerTags
    instanceName: instanceName
    //solutionVersion: solutionVersion
    AGId: actionGroupResourceId
    policyLocation: location
    parResourceGroupName: resourceGroupId
    resourceType: 'Microsoft.DataFactory/factories'
    solutionVersion: solutionVersion
  }
}
