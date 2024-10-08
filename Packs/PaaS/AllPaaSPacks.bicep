targetScope = 'managementGroup'
// @description('Name of the Action Group to be used or created.')
// param actionGroupName string = ''
// @description('Email receiver names to be used for the Action Group if being created.')
// param emailreceivers array = []
// @description('Email addresses to be used for the Action Group if being created.')
// param emailreiceversemails array = []
// @description('If set to true, a new Action group will be created')
// param useExistingAG bool
// @description('Name of the existing resource group to be used for the Action Group if existing.')
// param existingAGRG string = ''
// param _artifactsLocation string
// @secure()
// param _artifactsLocationSasToken string

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
var resourceGroupName = split(resourceGroupId, '/')[4]

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
module LogicApps './LogicApps/alerts.bicep' = {
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
    packTag: 'LogicApps'
    //grafanaName: grafanaName
    //dceId: dceId
    //customerTags: customerTags
    instanceName: instanceName
    AGId: actionGroupResourceId
    policyLocation: location
    parResourceGroupName: resourceGroupName
    solutionVersion: solutionVersion
    resourceType: 'Microsoft.Logic/workflows'
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
    parResourceGroupName: resourceGroupName
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
    parResourceGroupName: resourceGroupName
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
module KVAlerts './KeyVault/monitoring.bicep' = {
  name: 'KVAlerts'
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
    packtag: 'KeyVault'
    // grafanaName: grafanaName
    // dceId: dceId
    // customerTags: customerTags
    instanceName: instanceName
    solutionVersion: solutionVersion
  }
}
module vWan './Network/vWan/monitoring.bicep' = {
  name: 'vWanAlerts'
  params: {
    actionGroupResourceId: actionGroupResourceId
    assignmentLevel: assignmentLevel
    location: location
    mgname: mgname
    resourceGroupId: resourceGroupId
    solutionTag: solutionTag
    subscriptionId: subscriptionId
    userManagedIdentityResourceId: userManagedIdentityResourceId
    workspaceId: workspaceId
    packtag: 'vWan'
    solutionVersion: solutionVersion
    customerTags: customerTags
    instanceName: instanceName
  }
}
module LoadBalancers './Network/LoadBalancers/monitoring.bicep' = {
  name: 'LoadBalancersAlerts'
  params: {
    actionGroupResourceId: actionGroupResourceId
    assignmentLevel: assignmentLevel
    location: location
    mgname: mgname
    resourceGroupId: resourceGroupId
    solutionTag: solutionTag
    subscriptionId: subscriptionId
    userManagedIdentityResourceId: userManagedIdentityResourceId
    //workspaceId: workspaceId
    packtag: 'ALB'
    solutionVersion: solutionVersion
    //dceId: dceId
    //grafanaName: grafanaName
    customerTags: customerTags
    instanceName: instanceName
  }
}
module AA './AA/alerts.bicep' = {
  name: 'AA'
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
    packTag: 'AA'
    //grafanaName: grafanaName
    //dceId: dceId
    //customerTags: customerTags
    instanceName: instanceName
    solutionVersion: solutionVersion
    AGId: actionGroupResourceId
    policyLocation: location
    parResourceGroupName: resourceGroupName
    resourceType: 'Microsoft.Automation/automationAccounts'
  }
}
module AppGW './Network/AppGW/alerts.bicep' = {
  name: 'AppGWAlerts'
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
    packTag: 'AppGW'
    //grafanaName: grafanaName
    //dceId: dceId
    //customerTags: customerTags
    instanceName: instanceName
    solutionVersion: solutionVersion
    AGId: actionGroupResourceId
    policyLocation: location
    parResourceGroupName: resourceGroupName
    resourceType: 'Microsoft.Network/applicationGateways'
  }
}
module AzFW './Network/AzFW/alerts.bicep' = {
  name: 'AzFWAlerts'
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
    packTag: 'AzFW'
    //grafanaName: grafanaName
    //dceId: dceId
    //customerTags: customerTags
    instanceName: instanceName
    solutionVersion: solutionVersion
    AGId: actionGroupResourceId
    policyLocation: location
    parResourceGroupName: resourceGroupName
    resourceType: 'Microsoft.Network/azureFirewalls'
  }
}
module AzFD './Network/AzFD/alerts.bicep' = {
  name: 'AzFDAlerts'
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
    packTag: 'AzFD'
    //grafanaName: grafanaName
    //dceId: dceId
    //customerTags: customerTags
    instanceName: instanceName
    solutionVersion: solutionVersion
    AGId: actionGroupResourceId
    policyLocation: location
    parResourceGroupName: resourceGroupName
    resourceType: 'Microsoft.Network/frontdoors'
  }
}
module PrivZones './Network/PrivZones/alerts.bicep' = {
  name: 'PrivZonesAlerts'
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
    packTag: 'PrivZones'
    //grafanaName: grafanaName
    //dceId: dceId
    //customerTags: customerTags
    instanceName: instanceName
    solutionVersion: solutionVersion
    AGId: actionGroupResourceId
    policyLocation: location
    parResourceGroupName: resourceGroupName
    resourceType: 'Microsoft.Network/privateDnsZones'
  }
}
module PIP './Network/PIP/alerts.bicep' = {
  name: 'PIPAlerts'
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
    packTag: 'PIP'
    //grafanaName: grafanaName
    //dceId: dceId
    //customerTags: customerTags
    instanceName: instanceName
    solutionVersion: solutionVersion
    AGId: actionGroupResourceId
    policyLocation: location
    parResourceGroupName: resourceGroupName
    resourceType: 'Microsoft.Network/publicIPAddresses'
  }
}

module NSG './Network/NSG/alerts.bicep' = {
  name: 'NSGAlerts'
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
    packTag: 'NSG'
    //grafanaName: grafanaName
    //dceId: dceId
    //customerTags: customerTags
    instanceName: instanceName
    solutionVersion: solutionVersion
    AGId: actionGroupResourceId
    policyLocation: location
    parResourceGroupName: resourceGroupName
    resourceType: 'Microsoft.Network/networkSecurityGroups'
  }
}
