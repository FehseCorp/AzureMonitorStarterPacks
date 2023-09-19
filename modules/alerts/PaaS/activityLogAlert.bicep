targetScope = 'managementGroup'
param assignmentSuffix string //used to differenciate the assignment names, based on some criteria
param alertname string
param alertDisplayName string
param alertDescription string
param policyLocation string
param solutionTag string
param packTag string
param parResourceGroupTags object = {
  environment: 'test'
}
param parResourceGroupName string
param deploymentRoleDefinitionIds array = [
  '/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c'
]
param subscriptionId string
param mgname string
param assignmentLevel string
param userManagedIdentityResourceId string
param resourceTypes array

var parAlertState = 'true'


module ActivityLogKeyVaultDeleteAlert '../../alz/deploy.bicep' = {
  name: guid(alertname)
  params: {
      name: alertname
      displayName: alertDisplayName
      description: alertDescription
      location: policyLocation
      metadata: {
          version: '1.0.0'
          Category: 'ActivityLog'
          source: 'https://github.com/Azure/ALZ-Monitor/'
          '${solutionTag}': packTag
      }
      parameters: {
          tagName: {
              type: 'String'
              metadata: {
                displayName: 'Tag name'
                description: 'A tag to apply the association conditionally.'
              }
              defaultValue: solutionTag
          }
          tagValue: {
              type: 'String'
              metadata: {
                displayName: 'Tag Value'
                description: 'A tag to apply the association conditionally.'
              }
              defaultValue: packTag
          }
          enabled: {
              type: 'String'
              metadata: {
                  displayName: 'Alert State'
                  description: 'Alert state for the alert'
              }
              allowedValues: [
                  'true'
                  'false'
              ]
              defaultValue: parAlertState
          }
          alertResourceGroupName: {
              type: 'String'
              metadata: {
                  displayName: 'Resource Group Name'
                  description: 'Resource group the alert is placed in'
              }
              defaultValue: parResourceGroupName
          }
          alertResourceGroupTags: {
              type: 'Object'
              metadata: {
                  displayName: 'Resource Group Tags'
                  description: 'Tags on the Resource group the alert is placed in'
              }
              defaultValue: parResourceGroupTags
          }
      }
      policyRule: {
          if: {
              allOf: [
                  {
                      field: 'type'
                      equals: 'microsoft.keyvault/vaults'
                  }
                  {
                      field: '[concat(\'tags[\', parameters(\'tagName\'), \']\')]'
                      contains : '[parameters(\'tagValue\')]'
                  }
              ]
          }
          then: {
              effect: 'deployIfNotExists'
              details: {
                  roleDefinitionIds: deploymentRoleDefinitionIds
                  type: 'Microsoft.Insights/activityLogAlerts'
                  name: 'ActivityKeyVaultDelete'
                  existenceScope: 'resourcegroup'
                  resourceGroupName: '[parameters(\'alertResourceGroupName\')]'
                  deploymentScope: 'subscription'
                  existenceCondition: {
                      allOf: [
                          {
                              field: 'Microsoft.Insights/ActivityLogAlerts/enabled'
                              equals: '[parameters(\'enabled\')]'
                          }
                          {
                              count: {
                                  field: 'Microsoft.Insights/ActivityLogAlerts/condition.allOf[*]'
                                  where: {
                                      anyOf: [
                                          {
                                              allOf: [
                                                  {
                                                      field: 'Microsoft.Insights/ActivityLogAlerts/condition.allOf[*].field'
                                                      equals: 'category'
                                                  }
                                                  {
                                                      field: 'Microsoft.Insights/ActivityLogAlerts/condition.allOf[*].equals'
                                                      equals: 'Administrative'
                                                  }
                                              ]
                                          }
                                          {
                                              allOf: [
                                                  {
                                                      field: 'microsoft.insights/activityLogAlerts/condition.allOf[*].field'
                                                      equals: 'operationName'
                                                  }
                                                  {
                                                      field: 'microsoft.insights/activityLogAlerts/condition.allOf[*].equals'
                                                      equals: 'Microsoft.KeyVault/vaults/delete'
                                                  }
                                              ]
                                          }
                                      ]
                                  }
                              }
                              equals: 2
                          }
                      ]
                  }
                  deployment: {
                      location: policyLocation
                      properties: {
                          mode: 'incremental'
                          template: {
                              '$schema': 'https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#'
                              contentVersion: '1.0.0.0'
                              parameters: {
                                  alertResourceGroupName: {
                                      type: 'string'
                                  }
                                  alertResourceGroupTags: {
                                      type: 'object'
                                  }
                                  policyLocation: {
                                      type: 'string'
                                      defaultValue: policyLocation
                                  }
                                  enabled: {
                                      type: 'string'
                                  }
                              }
                              variables: {}
                              resources: [
                                  {
                                      type: 'Microsoft.Resources/resourceGroups'
                                      apiVersion: '2021-04-01'
                                      name: '[parameters(\'alertResourceGroupName\')]'
                                      location: policyLocation
                                      tags: '[parameters(\'alertResourceGroupTags\')]'
                                  }
                                  {
                                      type: 'Microsoft.Resources/deployments'
                                      apiVersion: '2019-10-01'
                                      name: 'ActivityKeyVaultDelete'
                                      resourceGroup: '[parameters(\'alertResourceGroupName\')]'
                                      dependsOn: [
                                          '[concat(\'Microsoft.Resources/resourceGroups/\', parameters(\'alertResourceGroupName\'))]'
                                      ]
                                      properties: {
                                          mode: 'Incremental'
                                          template: {
                                              '$schema': 'https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#'
                                              contentVersion: '1.0.0.0'
                                              parameters: {
                                                  enabled: {
                                                      type: 'string'
                                                  }
                                                  alertResourceGroupName: {
                                                      type: 'string'
                                                  }
                                              }
                                              variables: {}
                                              resources: [
                                                  {
                                                      type: 'microsoft.insights/activityLogAlerts'
                                                      apiVersion: '2020-10-01'
                                                      name: 'ActivityKeyVaultDelete'
                                                      location: 'global'
                                                      tags: {
                                                         '[parameters(\'solutionTag\')]': '[parameters(\'packTag\')]'
                                                      }
                                                      properties: {
                                                          description: 'Activity Log Key Vault Delete'
                                                          enabled: '[parameters(\'enabled\')]'
                                                          scopes: [
                                                              '[subscription().id]'
                                                          ]
                                                          condition: {
                                                              allOf: [
                                                                  {
                                                                      field: 'category'
                                                                      equals: 'Administrative'
                                                                  }
                                                                  {
                                                                      field: 'operationName'
                                                                      equals: 'Microsoft.KeyVault/vaults/delete'
                                                                  }
                                                                  {
                                                                      field: 'status'
                                                                      containsAny: [
                                                                          'succeeded'
                                                                      ]
                                                                  }
                                                              ]
                                                          }
                                                          parameters: {
                                                              enabled: {
                                                                  value: '[parameters(\'enabled\')]'
                                                              }
                                                          }
                                                      }
                                                  }
                                              ]
                                          }
                                          parameters: {
                                              enabled: {
                                                  value: '[parameters(\'enabled\')]'
                                              }
                                              alertResourceGroupName: {
                                                  value: '[parameters(\'alertResourceGroupName\')]'
                                              }
                                          }
                                      }
                                  }
                              ]
                          }
                          parameters: {
                              enabled: {
                                  value: '[parameters(\'enabled\')]'
                              }
                              alertResourceGroupName: {
                                  value: '[parameters(\'alertResourceGroupName\')]'
                              }
                              alertResourceGroupTags: {
                                  value: '[parameters(\'alertResourceGroupTags\')]'
                              }

                          }
                      }
                  }
              }
          }
      }
  }
}

module policyassignment '../../../modules/policies/mg/policiesDiag.bicep' = [for (rt,i) in resourceTypes: {
  name: guid('${alertname}-${i}-${assignmentSuffix}')
  dependsOn: [
      ActivityLogKeyVaultDeleteAlert
  ]
  params: {
    location: policyLocation
    mgname: mgname
    packtag: packTag
    policydefinitionId: ActivityLogKeyVaultDeleteAlert.outputs.resourceId
    resourceType: rt
    solutionTag: solutionTag
    subscriptionId: subscriptionId 
    userManagedIdentityResourceId: userManagedIdentityResourceId
    assignmentLevel: assignmentLevel
    policyType: 'alert'
    assignmentSuffix: assignmentSuffix
  }
}]

output policyResourceId string = ActivityLogKeyVaultDeleteAlert.outputs.resourceId