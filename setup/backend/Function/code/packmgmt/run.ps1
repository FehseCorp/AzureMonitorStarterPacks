using namespace System.Net

param($Request, $TriggerMetadata)

$instanceName=$env:InstanceName
$InformationPreference='SilentlyContinue'

Write-Host "PowerShell HTTP trigger function processed a request."

$resources = $Request.Body.Resources
$action = $Request.Body.Action
if ($action -eq 'importPack') {
    $newPacks=$Request.Body.PackDef | ConvertTo-Json -Depth 20
    Write-Host "New Packs: $newPacks"
    if ([string]::IsNullOrEmpty($newPacks)) {
      Write-Host "No new packs to import. Exiting."
      $body = "No new packs to import. Exiting."
      break
    }
    try {
      import-pack -packNewDefinition $newPacks
    }
    catch {
      Write-Host "Error importing pack. $_"
      $body = "Error importing pack. $_"
      break
    }
}
else {
  if ([string]::IsNullOrEmpty($Request.Body.Pack)) {
    $TagList = @()
  } else {
    $TagList = $Request.Body.Pack.split(',')
  }
  $PackType = $Request.Body.PackType
  $ResourceType = $Request.Body.Type
  $defaultAG=$Request.Body.DefaultAG
  $workspaceResourceId=$Request.Body.WorkspaceId
  if ($resources) {
      $TagName = $env:SolutionTag
      if ([string]::isnullorempty($TagName)) {
          $TagName = 'MonitorStarterPacks'
          Write-Host "Missing TagName. Please set the TagName environment variable. Setting to Default"
      }
      Write-Host "Working on $($resources.count) resource(s). Action: $action. Altering $TagName in the resource."
      Write-Host "Resources: $($resources | convertto-json -Depth 10)"
      switch ($action) {
        'AddPack' {
          foreach ($resource in $resources) {
            switch ($PackType) {
              'Iaas' {
                if ($TagList.Count -eq 0) {
                  Write-Host "Taglist is null. Setting to $($resource.Pack)"
                  $TagList = @($resource.Pack)
                }
                $InstallDependencyAgent = ($Taglist -contains 'SvcMap') ? $true : $false
                if ($InstallDependencyAgent) {
                  Write-Host "Will try to install dependency agent? $InstallDependencyAgent. Taglist is $TagList"
                }
                Add-Agent -resourceId $resource.Resource -ResourceOS $resource.OS -location $resource.Location -InstallDependencyAgent $InstallDependencyAgent
                foreach ($TagValue in $TagList) {
                  Write-Host "TAGMGMT: adding $TagValue tag to $($resource.Resource). PackType: $PackType. Instance Name: $instanceName"
                  Add-Monitoring -resourceId $resource.Resource `
                    -TagName $TagName `
                    -TagValue $TagValue `
                    -instanceName $instanceName `
                    -packType $PackType `
                    -resourceType 'Compute' `
                    -actionGroupId $defaultAG `
                    -workspaceResourceId $workspaceResourceId `
                    -location $resource.Location
                }
              }
              'Discovery' {
                $TagValue = $resource.Pack
                $InstallDependencyAgent = ($Taglist -contains 'SvcMap') ? $true : $false
                if ($InstallDependencyAgent) {
                  Write-Host "Will try to install dependency agent: $InstallDependencyAgent. Tag list is $Taglist"
                }
                Add-Agent -resourceId $resource.Resource -ResourceOS $resource.OS -location $resource.Location -InstallDependencyAgent $InstallDependencyAgent
                Write-Host "PackType: $PackType. Adding tag for resource type: $ResourceType. TagValue: $TagValue. Resource: $($resource.Resource)"
                Add-Monitoring -resourceId $resource.Resource `
                    -TagName $TagName `
                    -TagValue $TagValue `
                    -instanceName $instanceName `
                    -packType $PackType `
                    -resourceType 'Compute' `
                    -workspaceResourceId $workspaceResourceId `
                    -actionGroupId $defaultAG `
                    -location $resource.Location
              }
              'PaaS'  {
                Write-Host "PackType: $PackType"
                $ResourceType = $resource.type
                if ([string]::IsNullOrEmpty($ResourceType)) {
                  Write-Host "Error: No resource type found for $($resource.Resource)"
                  break
                }
                Write-Host "Adding tag for resource type: $ResourceType. Tagname: $TagName. Resource: $($resource.Resource)"
                Add-Monitoring -resourceId $resource.Resource `
                        -TagName $TagName `
                        -TagValue $ResourceType `
                        -resourceType $ResourceType `
                        -actionGroupId $defaultAG `
                        -packtype $packType `
                        -instanceName $instanceName `
                        -location $resource.location `
                        -workspaceResourceId $workspaceResourceId
                start-opstasks -TaskNames @("MonitoredServices","UnmonitoredServices")
              }
              default {
                Write-Host "Invalid PackType: $PackType"
              }
            }
          }
        }
        'RemoveTag' {
          foreach ($resource in $resources) {
            switch ($PackType) {
              'Iaas' {
                foreach ($TagValue in $TagList) {
                  Write-Host "TAGMGMT: removing $TagValue tag from $($resource.Resource). PackType: $PackType. Instance Name: $instanceName"
                  Remove-Monitoring  -resourceId $resource.Resource `
                              -TagName $TagName -TagValue $TagValue `
                              -PackType $PackType -instanceName $instanceName
                }
              }
              'Discovery' {
                $TagValue = $resource.Packs
                Write-Host "PackType: $PackType. Removing tag for resource type: $ResourceType. TagValue: $TagValue. Resource: $($resource.Resource)"
                if ($TagValue -ne '') {
                  Remove-Monitoring -resourceId $resource.Resource `
                    -TagName $TagName `
                    -TagValue $TagValue `
                    -instanceName $instanceName `
                    -packType $PackType
                }
                else {
                  Write-Host "Error: No tag value found for $($resource.Resource)"
                }
              }
              'Paas' {
                Write-Host "TAGMGMT: removing $TagValue tag from $($resource.Resource). PackType: $PackType. Instance Name: $instanceName"
                Remove-Monitoring -resourceId $resource.Resource -TagName $TagName -TagValue $resource.tag -PackType $PackType -instanceName $instanceName
              }
              default {
                Write-Host "Invalid PackType: $PackType"
              }
            }
          }
          start-opstasks
        }
        default {
            Write-Host "Invalid Action"
        }
      }
  }
  else {
      Write-Host "No resources provided."
  }
}

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::OK
        Body       = $body
})
