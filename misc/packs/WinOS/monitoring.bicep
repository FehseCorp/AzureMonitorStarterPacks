targetScope = 'managementGroup'
@description('The Tag value for this pack')
param packtag string = 'WinOS'
// @description('Name of the DCR rule to be created')
// param rulename string = 'AMSP-Windows-OS'
param actionGroupResourceId string
@description('location for the deployment.')
param location string //= resourceGroup().location
@description('Full resource ID of the log analytics workspace to be used for the deployment.')
param workspaceId string
param solutionTag string
param solutionVersion string
param dceId string
param userManagedIdentityResourceId string
param mgname string // this the last part of the management group id
param subscriptionId string
param resourceGroupId string
param assignmentLevel string
param customerTags object
param instanceName string
var rulename = 'AMP-${instanceName}-${packtag}'
var ruleshortname = 'AMP-${instanceName}-${packtag}'
var tempTags ={
  '${solutionTag}': packtag
  MonitoringPackType: 'IaaS'
  solutionVersion: solutionVersion
}
// if the customer has provided tags, then use them, otherwise use the default tags
var Tags = (customerTags=={}) ? tempTags : union(tempTags,customerTags.All)
//var ruleshortname = 'VMI-OS'
var resourceGroupName = split(resourceGroupId, '/')[4]

// Action Group
// module ag '../../../modules/actiongroups/ag.bicep' =  {
//   name: 'actiongroup'
//   params: {
//     actionGroupName: actionGroupName
//     existingAGRG: existingAGRG
//     emailreceiver: emailreceiver
//     emailreiceversemail: emailreiceversemail
//     useExistingAG: useExistingAG
//     newRGresourceGroup: resourceGroupName
//     solutionTag: solutionTag
//     subscriptionId: subscriptionId
//     location: location
//     Tags: Tags
//     //location: location defailt is global
//   }
// }

// // Alerts - Event viewer based alerts. Depend on the event viewer logs being enabled on the VMs events are being sent to the workspace via DCRs.
// module eventAlerts 'eventAlerts.bicep' = {
//   name: 'eventAlerts-${packtag}'
//   params: {
//     AGId: ag.outputs.actionGroupResourceId
//     location: location
//     workspaceId: workspaceId
//     packtag: packtag
//     solutionTag: solutionTag
//     solutionVersion: solutionVersion

//   }
// } 

// This option uses an existing VMI rule but this can be a tad problematic.
// resource vmInsightsDCR 'Microsoft.Insights/dataCollectionRules@2021-09-01-preview' existing = if(enableInsightsAlerts == 'true') {
//   name: insightsRuleName
//   scope: resourceGroup(insightsRuleRg)
// }
// So, let's create an Insights rule for the VMs that should be the same as the usual VMInsights.
//
// Previously, this pack was composed of VMInsights rules. Since there are conflicts Linux and Windows boxes running VMinsights and no way to determine if a machne is Linux or Windows, these have been deactivated.

// module vmInsightsDCR '../../../modules/DCRs/DefaultVMI-rule.bicep' = {
//   name: 'vmInsightsDCR-${packtag}'
//   scope: resourceGroup(subscriptionId, resourceGroupName)
//   params: {
//     location: location
//     workspaceResourceId: workspaceId
//     Tags: Tags
//     ruleName: rulename
//     dceId: dceId
//   }
// }

// module InsightsAlerts './alerts.bicep' = {
//   name: 'Alerts-${packtag}'
//   scope: resourceGroup(subscriptionId, resourceGroupName)
//   params: {
//     location: location
//     workspaceId: workspaceId
//     AGId: actionGroupResourceId
//     packtag: packtag
//     Tags: Tags
//     instanceName: instanceName
//   }
// }

// module policysetup '../../../modules/policies/mg/policies.bicep' = {
//   name: 'policysetup-${packtag}'
//   scope: managementGroup(mgname)
//   params: {
//     dcrId: vmInsightsDCR.outputs.VMIRuleId
//     packtag: packtag
//     solutionTag: solutionTag
//     rulename: rulename
//     location: location
//     userManagedIdentityResourceId: userManagedIdentityResourceId
//     mgname: mgname
//     ruleshortname: ruleshortname
//     assignmentLevel: assignmentLevel
//     subscriptionId: subscriptionId
//     instanceName: instanceName
//   }
// }

// Azure recommended Alerts for VMs
// These are the (very) basic recommeded alerts for VM, based on platform metrics
// module vmrecommended 'AzureBasicMetricAlerts.bicep' = if (enableBasicVMPlatformAlerts) {
//   name: 'vmrecommended'
//   params: {
//     vmIDs: vmIDs
//     packtag: packtag
//     solutionTag: solutionTag
//   }
// }
