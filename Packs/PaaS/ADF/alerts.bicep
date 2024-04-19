targetScope = 'managementGroup'
param solutionTag string
param packTag string
param subscriptionId string
param mgname string
param resourceType string
param policyLocation string
param parResourceGroupName string
param assignmentLevel string
param userManagedIdentityResourceId string
param AGId string
param instanceName string
param solutionVersion string

param deploymentRoleDefinitionIds array = [
    '/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c'
]
// param parResourceGroupTags object = {
//     environment: 'test'
// }
param parAlertState string = 'true'

module Alert1 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-PipelineFailedRuns'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'PipelineFailedRuns - factories'
      alertDisplayName: 'PipelineFailedRuns - Microsoft.DataFactory/factories'
      alertDescription: 'Failed pipeline runs metrics'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '1'
      metricName: 'PipelineFailedRuns'
      operator: 'GreaterThan'
      parEvaluationFrequency: 'PT1M'   
      parWindowSize: 'PT5M'
      parThreshold: '0'
      assignmentSuffix: 'Metfactories1'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Total'
    }
  }
module Alert2 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-MaxAllowedResourceCount'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'MaxAllowedResourceCount - factories'
      alertDisplayName: 'MaxAllowedResourceCount - Microsoft.DataFactory/factories'
      alertDescription: 'Maximum allowed entities count'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '1'
      metricName: 'MaxAllowedResourceCount'
      operator: 'LessThan'
      parEvaluationFrequency: 'PT30M'   
      parWindowSize: 'PT30M'
      parThreshold: '2500000'
      assignmentSuffix: 'Metfactories2'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Maximum'
    }
  }
module Alert3 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-FactorySizeInGbUnits'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'FactorySizeInGbUnits - factories'
      alertDisplayName: 'FactorySizeInGbUnits - Microsoft.DataFactory/factories'
      alertDescription: 'Total factory size (GB unit)'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '1'
      metricName: 'FactorySizeInGbUnits'
      operator: 'GreaterThan'
      parEvaluationFrequency: 'PT30M'   
      parWindowSize: 'PT30M'
      parThreshold: '6'
      assignmentSuffix: 'Metfactories3'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Maximum'
    }
  }
module Alert4 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-MaxAllowedFactorySizeInGbUnits'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'MaxAllowedFactorySizeInGbUnits - factories'
      alertDisplayName: 'MaxAllowedFactorySizeInGbUnits - Microsoft.DataFactory/factories'
      alertDescription: 'Maximum allowed factory size (GB unit)'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '1'
      metricName: 'MaxAllowedFactorySizeInGbUnits'
      operator: 'LessThan'
      parEvaluationFrequency: 'PT30M'   
      parWindowSize: 'PT30M'
      parThreshold: '8'
      assignmentSuffix: 'Metfactories4'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Maximum'
    }
  }
module Alert5 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-ResourceCount'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'ResourceCount - factories'
      alertDisplayName: 'ResourceCount - Microsoft.DataFactory/factories'
      alertDescription: 'Total entities count'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '1'
      metricName: 'ResourceCount'
      operator: 'GreaterThan'
      parEvaluationFrequency: 'PT30M'   
      parWindowSize: 'PT30M'
      parThreshold: '1700000'
      assignmentSuffix: 'Metfactories5'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Maximum'
    }
  }
module Alert6 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-PipelineSucceededRuns'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'PipelineSucceededRuns - factories'
      alertDisplayName: 'PipelineSucceededRuns - Microsoft.DataFactory/factories'
      alertDescription: 'Succeeded pipeline runs metrics'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '0'
      metricName: 'PipelineSucceededRuns'
      operator: 'GreaterThan'
      parEvaluationFrequency: 'PT5M'   
      parWindowSize: 'PT15M'
      parThreshold: '0'
      assignmentSuffix: 'Metfactories6'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Total'
    }
  }
module Alert7 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-ActivityFailedRuns'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'ActivityFailedRuns - factories'
      alertDisplayName: 'ActivityFailedRuns - Microsoft.DataFactory/factories'
      alertDescription: 'Failed activity runs metrics'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '1'
      metricName: 'ActivityFailedRuns'
      operator: 'GreaterThan'
      parEvaluationFrequency: 'PT1M'   
      parWindowSize: 'PT5M'
      parThreshold: '0'
      assignmentSuffix: 'Metfactories7'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Total'
    }
  }
module Alert8 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-TriggerFailedRuns'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'TriggerFailedRuns - factories'
      alertDisplayName: 'TriggerFailedRuns - Microsoft.DataFactory/factories'
      alertDescription: 'Failed trigger runs metrics'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '1'
      metricName: 'TriggerFailedRuns'
      operator: 'GreaterThan'
      parEvaluationFrequency: 'PT1M'   
      parWindowSize: 'PT5M'
      parThreshold: '0'
      assignmentSuffix: 'Metfactories8'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Total'
    }
  }
module Alert9 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-IntegrationRuntimeCpuPercentage'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'IntegrationRuntimeCpuPercentage - factories'
      alertDisplayName: 'IntegrationRuntimeCpuPercentage - Microsoft.DataFactory/factories'
      alertDescription: 'Integration runtime CPU utilization'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '3'
      metricName: 'IntegrationRuntimeCpuPercentage'
      operator: 'GreaterThan'
      parEvaluationFrequency: 'PT1M'   
      parWindowSize: 'PT5M'
      parThreshold: '95'
      assignmentSuffix: 'Metfactories9'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Average'
    }
  }
module Alert10 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-PipelineElapsedTimeRuns'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'PipelineElapsedTimeRuns - factories'
      alertDisplayName: 'PipelineElapsedTimeRuns - Microsoft.DataFactory/factories'
      alertDescription: 'Elapsed Time Pipeline Runs Metrics'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '3'
      metricName: 'PipelineElapsedTimeRuns'
      operator: 'GreaterThan'
      parEvaluationFrequency: 'PT5M'   
      parWindowSize: 'PT30M'
      parThreshold: '0'
      assignmentSuffix: 'Metfactories10'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Total'
    }
  }
module Alert11 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-IntegrationRuntimeAvailableMemory'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'IntegrationRuntimeAvailableMemory - factories'
      alertDisplayName: 'IntegrationRuntimeAvailableMemory - Microsoft.DataFactory/factories'
      alertDescription: 'Integration runtime available memory'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '3'
      metricName: 'IntegrationRuntimeAvailableMemory'
      operator: 'LessThanOrEqual'
      parEvaluationFrequency: 'PT1M'   
      parWindowSize: 'PT5M'
      parThreshold: '5000000000'
      assignmentSuffix: 'Metfactories11'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Average'
    }
  }
module Alert12 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-ActivitySucceededRuns'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'ActivitySucceededRuns - factories'
      alertDisplayName: 'ActivitySucceededRuns - Microsoft.DataFactory/factories'
      alertDescription: 'Succeeded activity runs metrics'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '3'
      metricName: 'ActivitySucceededRuns'
      operator: 'GreaterThan'
      parEvaluationFrequency: 'PT1M'   
      parWindowSize: 'PT1M'
      parThreshold: '0'
      assignmentSuffix: 'Metfactories12'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Total'
    }
  }
module Alert13 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-PipelineCancelledRuns'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'PipelineCancelledRuns - factories'
      alertDisplayName: 'PipelineCancelledRuns - Microsoft.DataFactory/factories'
      alertDescription: 'Cancelled pipeline runs metrics'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '1'
      metricName: 'PipelineCancelledRuns'
      operator: 'GreaterThan'
      parEvaluationFrequency: 'PT1M'   
      parWindowSize: 'PT1M'
      parThreshold: '0'
      assignmentSuffix: 'Metfactories13'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Total'
    }
  }
module Alert14 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-IntegrationRuntimeAvailableNodeNumber'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'IntegrationRuntimeAvailableNodeNumber - factories'
      alertDisplayName: 'IntegrationRuntimeAvailableNodeNumber - Microsoft.DataFactory/factories'
      alertDescription: 'Integration runtime available node count'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '1'
      metricName: 'IntegrationRuntimeAvailableNodeNumber'
      operator: 'LessThan'
      parEvaluationFrequency: 'PT5M'   
      parWindowSize: 'PT5M'
      parThreshold: '1'
      assignmentSuffix: 'Metfactories14'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Average'
    }
  }
module Alert15 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-TriggerSucceededRuns'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'TriggerSucceededRuns - factories'
      alertDisplayName: 'TriggerSucceededRuns - Microsoft.DataFactory/factories'
      alertDescription: 'Succeeded trigger runs metrics'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '4'
      metricName: 'TriggerSucceededRuns'
      operator: 'GreaterThan'
      parEvaluationFrequency: 'PT1M'   
      parWindowSize: 'PT1M'
      parThreshold: '0'
      assignmentSuffix: 'Metfactories15'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Total'
    }
  }
module Alert16 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-SSISIntegrationRuntimeStartFailed'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'SSISIntegrationRuntimeStartFailed - factories'
      alertDisplayName: 'SSISIntegrationRuntimeStartFailed - Microsoft.DataFactory/factories'
      alertDescription: 'Failed SSIS integration runtime start metrics'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '2'
      metricName: 'SSISIntegrationRuntimeStartFailed'
      operator: 'GreaterThan'
      parEvaluationFrequency: 'PT5M'   
      parWindowSize: 'PT5M'
      parThreshold: '0'
      assignmentSuffix: 'Metfactories16'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Total'
    }
  }
module Alert17 '../../../modules/alerts/PaaS/metricAlertStaticThreshold.bicep' = {
    name: '${uniqueString(deployment().name)}-SSISPackageExecutionFailed'
    params: {
    assignmentLevel: assignmentLevel
      policyLocation: policyLocation
      mgname: mgname
      packTag: packTag
      resourceType: resourceType
      solutionTag: solutionTag
      subscriptionId: subscriptionId
      userManagedIdentityResourceId: userManagedIdentityResourceId
      deploymentRoleDefinitionIds: deploymentRoleDefinitionIds
      alertname: 'SSISPackageExecutionFailed - factories'
      alertDisplayName: 'SSISPackageExecutionFailed - Microsoft.DataFactory/factories'
      alertDescription: 'Failed SSIS package execution metrics'
      metricNamespace: 'Microsoft.DataFactory/factories'
      parAlertSeverity: '2'
      metricName: 'SSISPackageExecutionFailed'
      operator: 'GreaterThan'
      parEvaluationFrequency: 'PT5M'   
      parWindowSize: 'PT5M'
      parThreshold: '0'
      assignmentSuffix: 'Metfactories17'
      parAutoMitigate: 'false'
      parPolicyEffect: 'deployIfNotExists'
      AGId: AGId
      parAlertState: parAlertState
      initiativeMember: true
      packtype: 'PaaS'
      instanceName: instanceName
      timeAggregation: 'Total'
    }
  }
  module policySet '../../../modules/policies/mg/policySetGeneric.bicep' = {
    name: '${packTag}-PolicySet'
    params: {
        initiativeDescription: 'AMP-Policy Set to deploy ${resourceType} monitoring policies'
        initiativeDisplayName: 'AMP-${resourceType} monitoring policies'
        initiativeName: '${packTag}-PolicySet'
        solutionTag: solutionTag
        category: 'Monitoring'
        version: solutionVersion
        assignmentLevel: assignmentLevel
        location: policyLocation
        subscriptionId: subscriptionId
        packtag: packTag
        userManagedIdentityResourceId: userManagedIdentityResourceId
        instanceName: instanceName
        policyDefinitions: [
          {
              policyDefinitionId: Alert1.outputs.policyId
          }
          {
              policyDefinitionId: Alert2.outputs.policyId
          }
          {
              policyDefinitionId: Alert3.outputs.policyId
          }
          {
              policyDefinitionId: Alert4.outputs.policyId
          }
          {
              policyDefinitionId: Alert5.outputs.policyId
          }
          {
              policyDefinitionId: Alert6.outputs.policyId
          }
          {
              policyDefinitionId: Alert7.outputs.policyId
          }
          {
              policyDefinitionId: Alert8.outputs.policyId
          }
          {
              policyDefinitionId: Alert9.outputs.policyId
          }
          {
              policyDefinitionId: Alert10.outputs.policyId
          }
          {
              policyDefinitionId: Alert11.outputs.policyId
          }
          {
              policyDefinitionId: Alert12.outputs.policyId
          }
          {
              policyDefinitionId: Alert13.outputs.policyId
          }
          {
              policyDefinitionId: Alert14.outputs.policyId
          }
          {
              policyDefinitionId: Alert15.outputs.policyId
          }
          {
              policyDefinitionId: Alert16.outputs.policyId
          }
          {
              policyDefinitionId: Alert17.outputs.policyId
          }
        ]
    }
  }
