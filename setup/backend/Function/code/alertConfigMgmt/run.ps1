using namespace System.Net

param($Request, $TriggerMetadata)

Write-Host "alertConfigMgmt: PowerShell HTTP trigger function processed a request."

$alerts = $Request.Body.alerts
$action = $Request.Body.Action
$statusCode = [HttpStatusCode]::OK

if ([string]::IsNullOrEmpty($action)) {
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::BadRequest
        Body = '{"error": "Missing required field: Action"}'
    })
    return
}

if (-not $alerts -or $alerts.Count -eq 0) {
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::BadRequest
        Body = '{"error": "Missing or empty required field: alerts"}'
    })
    return
}

$TagName = $env:TagName
if ([string]::isnullorempty($TagName)) {
    $TagName = 'MonitorStarterPacks'
    Write-Host "alertConfigMgmt: Missing TagName env var. Using default: $TagName"
}

try {
    Write-Host "alertConfigMgmt: Working on $($alerts.count) alert(s). Action: $action."
    switch ($action) {
        'Enable' {
            $bodyAction = @"
            {
                "properties": {
                  "enabled": "true"
                }
            }
"@
            foreach ($alert in $alerts) {
                $alertinfo = $alert.id.split("/")
                Write-Host "alertConfigMgmt: Enabling $($alertinfo[8])."
                $apiversion = get-alertApiVersion -alertId $alert.id
                $patchURL = "https://management.azure.com/subscriptions/{0}/resourcegroups/{1}/providers/Microsoft.Insights/{3}/{2}?api-version=$apiversion" -f $alertinfo[2], $alertinfo[4], $alertinfo[8], $alertinfo[7]
                Invoke-AzRestMethod -Method PATCH -Uri $patchURL -Payload $bodyAction
            }
        }
        'Disable' {
            $bodyAction = @"
            {
                "properties": {
                  "enabled": "false"
                }
            }
"@
            foreach ($alert in $alerts) {
                $alertinfo = $alert.id.split("/")
                $apiversion = get-alertApiVersion -alertId $alert.id
                Write-Host "alertConfigMgmt: Disabling $($alertinfo[8])."
                $patchURL = "https://management.azure.com/subscriptions/{0}/resourcegroups/{1}/providers/Microsoft.Insights/{3}/{2}?api-version=$apiversion" -f $alertinfo[2], $alertinfo[4], $alertinfo[8], $alertinfo[7]
                Invoke-AzRestMethod -Method PATCH -Uri $patchURL -Payload $bodyAction
            }
        }
        'Update' {
            $actionGroupId = $Request.Body.aGroup.id
            if ([string]::IsNullOrEmpty($actionGroupId)) {
                $statusCode = [HttpStatusCode]::BadRequest
                $body = '{"error": "Missing required field: aGroup.id for Update action"}'
                Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
                    StatusCode = $statusCode
                    Body = $body
                })
                return
            }
            foreach ($alert in $alerts) {
                $alertinfo = $alert.id.split("/")
                $apiversion = get-alertApiVersion -alertId $alert.id
                Write-Host "alertConfigMgmt: Updating action group for $($alertinfo[8])."
                switch ($alertinfo[7]) {
                    'activityLogAlerts' {
                        $getURL = "https://management.azure.com/subscriptions/{0}/resourcegroups/{1}/providers/{2}/{3}/{4}?api-version=$apiversion" -f $alertinfo[2], $alertinfo[4], $alertinfo[6], $alertinfo[7], $alertinfo[8]
                        $alertConfig = (Invoke-AzRestMethod -Method GET -Uri $getURL).Content | convertfrom-json
                        $alertConfig.properties.actions.actionGroups[0].actionGroupId = $actionGroupId
                        $putURL = "https://management.azure.com/subscriptions/{0}/resourcegroups/{1}/providers/{2}/{3}/{4}?api-version=$apiversion" -f $alertinfo[2], $alertinfo[4], $alertinfo[6], $alertinfo[7], $alertinfo[8]
                        $bodyAction = $alertConfig | convertto-json -Depth 15
                        Invoke-AzRestMethod -Method PUT -Uri $putURL -Payload $bodyAction
                    }
                    'metricAlerts' {
                        $patchURL = "https://management.azure.com/subscriptions/{0}/resourcegroups/{1}/providers/{2}/{3}/{4}?api-version=$apiversion" -f $alertinfo[2], $alertinfo[4], $alertinfo[6], $alertinfo[7], $alertinfo[8]
                        $bodyAction = @"
                        {
                            "properties": {
                                "actions": [{
                                    "actionGroupId": "$actionGroupId"
                                }]
                            }
                        }
"@
                        Invoke-AzRestMethod -Method PATCH -Uri $patchURL -Payload $bodyAction
                    }
                    default {
                        Update-AzScheduledQueryRule -ResourceGroupName $alertinfo[4] -Name $alertinfo[8] -ActionGroupResourceId $actionGroupId
                    }
                }
            }
        }
        'Delete' {
            foreach ($alert in $alerts) {
                $alertinfo = $alert.id.split("/")
                Write-Host "alertConfigMgmt: Deleting $($alertinfo[8])."
                Remove-AzResource -ResourceId $alert.id -Force
            }
        }
        default {
            $statusCode = [HttpStatusCode]::BadRequest
            $body = "{""error"": ""Invalid action: $action. Valid actions are: Enable, Disable, Update, Delete""}"
        }
    }
    if ($statusCode -eq [HttpStatusCode]::OK -and -not $body) {
        $body = "Successfully processed $($alerts.count) alert(s) with action '$action'."
    }
}
catch {
    Write-Host "alertConfigMgmt: Error processing action '$action': $_"
    $statusCode = [HttpStatusCode]::InternalServerError
    $body = "{""error"": ""Error processing action '$action': $($_.Exception.Message)""}"
}

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = $statusCode
    Body = $body
})
