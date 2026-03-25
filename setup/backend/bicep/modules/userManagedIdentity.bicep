////targetScope = 'managementGroup'
targetScope = 'subscription'
param location string
param Tags object
param roleDefinitionIds array
param userIdentityName string
param subscriptionId string
param resourceGroupName string
param addRGRoleAssignments bool = false
param solutionTag string
param instanceName string
param createNewStorageAccount bool
param storageAccountName string=''

var RGroleDefinitionIds=[

  //contributor roles
  'b24988ac-6180-42a0-ab88-20f7382dd24c' // Contributor Role Definition Id for Contributor
  //grafana admin
  '22926164-76b3-42b3-bc55-97df8dab3e41' // Grafana Admin
  //Above role should be able to add diagnostics to everything according to docs.
  // '/providers/Microsoft.Authorization/roleDefinitions/4a9ae827-6dc8-4573-8ac7-8239d42aa03f' // Tag Contributor
]
// resource userManagedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
//   name: userIdentityName
//   location: location
//   tags: {
//     '${solutionTag}': userIdentityName
//     '${solutionTag}-Version': solutionVersion
//   }
// }
module userManagedIdentity './umidentityresource.bicep' = {
  name: '${userIdentityName}-${location}'
  scope: resourceGroup(subscriptionId,resourceGroupName)
  params: {
    location: location
    Tags: Tags
    userIdentityName: userIdentityName
  }
}
// Storage roles required for identity-based Azure Functions connections
var storageRoleDefinitionIds = [
  'b7e6dc6d-f1e8-4753-8033-0f276bb0955b' // Storage Blob Data Owner (host lease management)
  '974c5e8b-45b9-4653-ba55-5f855dd0fb88' // Storage Queue Data Contributor
  '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3' // Storage Table Data Contributor
  '69566ab7-960f-475b-8e7c-b3118f30c6bd' // Storage File Data Privileged Contributor (content share)
]

// Assign storage roles to the user managed identity for the storage account that already exists
module storageAccountRoleAssignment '../../../../modules/rbac/resources/rbacstorageaccount.bicep' = [for (roleId, i) in storageRoleDefinitionIds: if (createNewStorageAccount == false) {
  name: 'STO-${i}-${userIdentityName}-${location}'
  scope: resourceGroup(subscriptionId,resourceGroupName)
  params: {
    resourcename: userIdentityName
    principalId: userManagedIdentity.outputs.userManagedIdentityPrincipalId
    solutionTag: solutionTag
    roleDefinitionId: roleId
    roleShortName: roleId
    storageaccountName: storageAccountName
  }
}]

module userIdentityRoleAssignments '../../../../modules/rbac/subscription/roleassignment.bicep' =  [for (roledefinitionId, i) in roleDefinitionIds:  {
  name: '${userIdentityName}-${i}-${location}'
//  scope: managementGroup(mgname)
  params: {
    resourcename: userIdentityName
    principalId: userManagedIdentity.outputs.userManagedIdentityPrincipalId
    solutionTag: solutionTag
    roleDefinitionId: roledefinitionId
    roleShortName: roledefinitionId
    instanceName: instanceName
  }
}]

module userIdentityRoleAssignmentRG '../../../../modules/rbac/resourceGroup/roleassignment.bicep' = [for (roledefinitionId, i) in RGroleDefinitionIds: if (addRGRoleAssignments) {
  name: '${userIdentityName}-${i}-RG'
  scope: resourceGroup(subscriptionId,resourceGroupName)
  params: {
    resourcename: userIdentityName
    principalId: userManagedIdentity.outputs.userManagedIdentityPrincipalId
    solutionTag: solutionTag
    roleDefinitionId: roledefinitionId
    roleShortName: roledefinitionId
  }
}]

output userManagedIdentityPrincipalId string = userManagedIdentity.outputs.userManagedIdentityPrincipalId
output userManagedIdentityClientId string = userManagedIdentity.outputs.userManagedIdentityClientId
output userManagedIdentityResourceId string = userManagedIdentity.outputs.userManagedIdentityResourceId
