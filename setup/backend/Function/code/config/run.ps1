using namespace System.Net
param($Request, $TriggerMetadata)

Write-Host "config: PowerShell HTTP trigger function processed a request."

$Action = $Request.Query.Action
if ([string]::IsNullOrEmpty($Action)) {
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::BadRequest
        Body       = '{"error": "Missing required query parameter: Action"}'
    })
    return
}

Write-Host "config: Action=$Action"
$ambaURL = $env:AMBAJsonURL
$statusCode = [HttpStatusCode]::OK

try {
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
          $discoveryResults = get-discoveryresults -instanceName $instanceName
          if ($discoveryResults -and $discoveryResults -isnot [bool]) {
            $jsonResults = $discoveryResults | Where-Object { $_ -isnot [bool] } | ConvertTo-Json -Depth 10 -Compress
            if ($discoveryResults.Count -eq 1) { $jsonResults = "[$jsonResults]" }
            $body = "{""Discovered"" : $jsonResults }"
          }
          else {
            $body = '{"Discovered" : []}'
          }
        }
        else {
          $body = '{}'
        }
      }
      "getAllPaaS" {
        $body = get-allPaaSServices
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
        $statusCode = [HttpStatusCode]::BadRequest
        $body = "{""error"": ""Unknown action: $Action""}"
      }
    }
}
catch {
    Write-Host "config: Error processing action '$Action': $_"
    $statusCode = [HttpStatusCode]::InternalServerError
    $body = "{""error"": ""Error processing action '$Action': $($_.Exception.Message)""}"
}

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = $statusCode
    Body       = $body
})

