using namespace System.Net
param($Request, $TriggerMetadata)

Write-Host "PowerShell HTTP trigger function processed a request."

$Action = $Request.Query.Action
Write-Host "Action: $Action"
$ambaURL = $env:AMBAJsonURL

switch ($Action) {
  'getInstanceName' {
    $instanceName = $env:InstanceName
    $body = @"
        {
            "InstanceName":"$($instanceName)"
        }
"@ | convertfrom-json
  }
  'getAllServiceTags' {
    $type = $Request.Query.Type
    if ([string]::IsNullOrEmpty($type)) {
      $body = $tagMapping.tags | Select-Object tag, @{Label = "nameSpace"; Expression = { $_.nameSpace.ToLower() } }, type | convertto-json
    }
    else {
      $body = $tagMapping.tags | where-object { $_.type -eq $type } | Select-Object tag, @{Label = "nameSpace"; Expression = { $_.nameSpace.ToLower() } }, type | convertto-json
    }
  }
  'getdiscoveryresults' {
    $instanceName = $env:InstanceName
    if ($instanceName) {
      $body = "{""Discovered"" : $(get-discoveryresults -instanceName $instanceName) }"
    }
    else {
      $body = '{}'
    }
  }
  "getNonMonitoredPaaS" {
    $body = get-nonMonitoredPaaSServices -Request $Request
  }
  "getMonitoredPaaS" {
    $body = get-monitoredPaaSServices -Request $Request
  }
  "getSupportedServices" {
    $body = (get-AmbaCatalog -ambaJsonURL $ambaURL | convertfrom-json).Categories.namespace | Select-Object @{Label = "nameSpace"; Expression = { $_.ToLower() } } | convertto-json
  }
  "runDiscovery" {
    $instanceName = $env:InstanceName
    if ($instanceName) {
      get-discoveryresults -instanceName $instanceName
    }
    else {
      $body = '{}'
    }
  }
  "getavailableIaaSPacks" {
    $body = get-availableIaaSPacks -packContentURL $env:PacksURL
  }
  "getPacksDefinition" {
    $body = get-PacksDefinition
  }
  'getIaaSPacksDetails' {
    $body = get-IaaSPacksContent
    if ($null -eq $body) {
      $body = '{}'
    }
  }
  'getServicesPacksDetails' {
    $body = get-AmbaCatalog
    if ($null -eq $body) {
      $body = '{}'
    }
  }
  default {
    $body = '{"No matching action."}'
  }
}

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = [HttpStatusCode]::OK
    Body       = $body
  })

