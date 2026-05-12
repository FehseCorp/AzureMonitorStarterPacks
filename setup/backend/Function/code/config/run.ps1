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
      "getJobStatus" {
        $jobId = $Request.Query.JobId
        if ([string]::IsNullOrEmpty($jobId)) {
            $statusCode = [HttpStatusCode]::BadRequest
            $body = '{"error": "Missing required query parameter: JobId"}'
            break
        }
        $storageConn = $env:AzureWebJobsStorage

        # Parse AccountName and AccountKey from connection string
        # (AccountKey is base64 and may contain '=' so split on first '=' per segment)
        $acct = ''; $key = ''
        ($storageConn -split ';') | Where-Object { $_ } | ForEach-Object {
            $i = $_.IndexOf('=')
            if ($i -gt 0 -and $_.Substring(0, $i) -eq 'AccountName') { $acct = $_.Substring($i + 1) }
        }
        if ($storageConn -match 'AccountKey=([A-Za-z0-9+/]+=*)') { $key = $Matches[1] }

        # Query Table Storage via REST with SharedKey Lite auth.
        # This avoids loading any Azure SDK types in the PowerShell runspace.
        $safeId    = $jobId -replace "'", "''"   # OData single-quote escaping
        $filter    = "PartitionKey eq '$safeId'"
        $date      = [DateTime]::UtcNow.ToString('R')
        $tableName = 'packmgmtjobs'
        $url       = "https://$acct.table.core.windows.net/${tableName}?`$filter=$([Uri]::EscapeDataString($filter))"

        # SharedKey Lite signature for Table service.
        # StringToSign = Date + "\n" + CanonicalizedResource  (Table-service format, NOT Blob format)
        $canonRes   = "/$acct/$tableName"
        $stringSign = "$date`n$canonRes"
        $hmac = [System.Security.Cryptography.HMACSHA256]::new([Convert]::FromBase64String($key))
        $sig  = [Convert]::ToBase64String($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($stringSign)))

        $resp = Invoke-RestMethod -Method GET -Uri $url -Headers @{
            'Authorization'      = "SharedKeyLite ${acct}:${sig}"
            'x-ms-date'          = $date
            'x-ms-version'       = '2020-12-06'
            'Accept'             = 'application/json;odata=nometadata'
            'DataServiceVersion' = '3.0;NetFx'
        } -ErrorAction Stop

        $rows       = @($resp.value)
        $jobRow     = $rows | Where-Object { $_.RowKey -eq '_job' }
        $resultRows = $rows | Where-Object { $_.RowKey -ne '_job' }

        if (-not $jobRow) {
            $body = "{""error"": ""Job $jobId not found""}"
            break
        }

        # Derive progress by counting result rows (no server-side counters needed)
        $totalCount     = [int]$jobRow.Total
        $completedCount = @($resultRows | Where-Object { $_.Status -eq 'Succeeded' }).Count
        $failedCount    = @($resultRows | Where-Object { $_.Status -eq 'Failed' }).Count
        $doneCount      = $completedCount + $failedCount

        # If the job has been sitting at 0 progress for more than 15 minutes it is
        # likely stuck (e.g. all messages went to the poison queue).  Surface it as
        # Failed so the portal stops polling and shows an actionable error.
        $jobCreated = $jobRow.Timestamp  # DateTimeOffset from Table Storage
        $stuckTimeout = [TimeSpan]::FromMinutes(15)
        $isStuck = ($doneCount -eq 0 -and $totalCount -gt 0 -and
                    $jobCreated -and ([DateTimeOffset]::UtcNow - $jobCreated) -gt $stuckTimeout)

        $jobStatus      = if ($isStuck) { 'Failed' }
                          elseif ($doneCount -ge $totalCount -and $totalCount -gt 0) { 'Completed' }
                          elseif ($doneCount -gt 0) { 'Running' }
                          else { 'Queued' }

        $results = $resultRows | ForEach-Object {
            @{
                ResourceId = [string]$_.ResourceId
                Status     = [string]$_.Status
                Detail     = [string]$_.Detail
                Action     = [string]$_.Action
            }
        }
        $summary = @{
            JobId     = $jobId
            Status    = $jobStatus
            Total     = $totalCount
            Completed = $completedCount
            Failed    = $failedCount
            Action    = [string]$jobRow.Action
            Results   = @($results)
        }
        $body = $summary | ConvertTo-Json -Depth 5 -Compress
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

