targetScope = 'managementGroup'

@description('Name of the Action Group to be used or created.')
param actionGroupName string = ''
@description('Email receiver names to be used for the Action Group if being created.')
param emailreceivers array = []
@description('Email addresses to be used for the Action Group if being created.')
param emailreiceversemails array = []
@description('If set to true, a new Action group will be created')
param useExistingAG bool
@description('Name of the existing resource group to be used for the Action Group if existing.')
param existingAGRG string = ''
@description('location for the deployment.')
param location string //= resourceGroup().location
@description('Full resource ID of the log analytics workspace to be used for the deployment.')
param workspaceId string
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
param grafanaName string
param deployAllPacks bool
param deployAllIaaSPacks bool
param deployAllPlatformPacks bool
param deployAllPaaSPacks bool

module AllIaaSPacks './IaaS/AllIaaSPacks.bicep' = if(deployAllIaaSPacks || deployAllPacks) {
  name: 'DeployAllIaaSPacks'
  params: {
    assignmentLevel: assignmentLevel
    location: location
    dceId: dceId
    mgname: mgname
    solutionTag: solutionTag
    solutionVersion: solutionVersion
    subscriptionId: subscriptionId
    useExistingAG: useExistingAG
    userManagedIdentityResourceId: userManagedIdentityResourceId
    workspaceId: workspaceId
    actionGroupName: actionGroupName
    resourceGroupId: resourceGroupId
    emailreceivers: emailreceivers
    emailreiceversemails: emailreiceversemails
    existingAGRG: existingAGRG
    grafanaName: grafanaName
  }
}

module AllPaaSPacks './PaaS/AllPaaSPacks.bicep' = if(deployAllPaaSPacks || deployAllPacks) {
  name: 'DeployAllPaaSPacks'
  params: {
    assignmentLevel: assignmentLevel
    location: location
    dceId: dceId
    mgname: mgname
    solutionTag: solutionTag
    solutionVersion: solutionVersion
    subscriptionId: subscriptionId
    useExistingAG: useExistingAG
    userManagedIdentityResourceId: userManagedIdentityResourceId
    workspaceId: workspaceId
    actionGroupName: actionGroupName
    resourceGroupId: resourceGroupId
    emailreceivers: emailreceivers
    emailreiceversemails: emailreiceversemails
    existingAGRG: existingAGRG
    grafanaName: grafanaName
  }
}

module AllPlatformPacks './Platform/AllPlatformPacks.bicep' = if(deployAllPlatformPacks || deployAllPacks){
  name: 'DeployAllPlatformPacks'
  params: {
    assignmentLevel: assignmentLevel
    location: location
    dceId: dceId
    mgname: mgname
    solutionTag: solutionTag
    solutionVersion: solutionVersion
    subscriptionId: subscriptionId
    useExistingAG: useExistingAG
    userManagedIdentityResourceId: userManagedIdentityResourceId
    workspaceId: workspaceId
    actionGroupName: actionGroupName
    resourceGroupId: resourceGroupId
    emailreceivers: emailreceivers
    emailreiceversemails: emailreiceversemails
    existingAGRG: existingAGRG
    grafanaName: grafanaName
  }
}
