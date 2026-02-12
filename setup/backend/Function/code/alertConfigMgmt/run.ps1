using namespace System.Net

param($Request, $TriggerMetadata)

Write-Host "PowerShell HTTP trigger function processed a request."

$alerts = $Request.Body.alerts
$action = $Request.Body.Action

if ($alerts) {
    $TagName=$env:TagName
    if ([string]::isnullorempty($TagName)) {
        $TagName='MonitorStarterPacks'
        Write-Host "Missing TagName. Please set the TagName environment variable. Setting to Default"
    }
    Write-Host "Working on $($alerts.count) alert(s). Action: $action."
    switch ($action) {
        'Enable' {
            $bodyAction=@"
            {
                "properties": {
                  "enabled": "true"
                }
            }
"@
            foreach ($alert in $alerts) {
                $alertinfo=$alert.id.split("/")
                Write-Host "Running $action for $($alertinfo[8]) alert."
                $apiversion=get-alertApiVersion -alertId $alert.id
                $patchURL="https://management.azure.com/subscriptions/{0}/resourcegroups/{1}/providers/Microsoft.Insights/{3}/{2}?api-version=$apiversion" -f $alertinfo[2],$alertinfo[4], $alertinfo[8], $alertinfo[7]
                Invoke-AzRestMethod -Method PATCH -Uri $patchURL -Payload $bodyAction
            }
        }
        'Disable' {
            $bodyAction=@"
            {
                "properties": {
                  "enabled": "false"
                }
            }
"@
            foreach ($alert in $alerts) {
                $alertinfo=$alert.id.split("/")
                $apiversion=get-alertApiVersion -alertId $alert.id
                Write-Host "Running $action for $($alertinfo[8]) alert."
                $patchURL="https://management.azure.com/subscriptions/{0}/resourcegroups/{1}/providers/Microsoft.Insights/{3}/{2}?api-version=$apiversion" -f $alertinfo[2],$alertinfo[4], $alertinfo[8],$alertinfo[7]
                Invoke-AzRestMethod -Method PATCH -Uri $patchURL -Payload $bodyAction
            }
        }
        'Update' {
            $actionGroupId = $Request.Body.aGroup.id
            foreach ($alert in $alerts) {
                $alertinfo=$alert.id.split("/")
                $apiversion=get-alertApiVersion -alertId $alert.id
                switch ($alertinfo[7]) {
                    'activityLogAlerts' {
                        $getURL="https://management.azure.com/subscriptions/{0}/resourcegroups/{1}/providers/{2}/{3}/{4}?api-version=$apiversion" -f $alertinfo[2],$alertinfo[4], $alertinfo[6], $alertinfo[7], $alertinfo[8]
                        $alertConfig=(Invoke-AzRestMethod -Method GET -Uri $getURL).Content | convertfrom-json
                        $alertConfig.properties.actions.actionGroups[0].actionGroupId=$actionGroupId
                        $putURL="https://management.azure.com/subscriptions/{0}/resourcegroups/{1}/providers/{2}/{3}/{4}?api-version=$apiversion" -f $alertinfo[2],$alertinfo[4], $alertinfo[6], $alertinfo[7], $alertinfo[8]
                        $bodyAction=$alertConfig | convertto-json -Depth 15
                        Invoke-AzRestMethod -Method PUT -Uri $putURL -Payload $bodyAction
                    }
                    'metricAlerts' {
                        $patchURL="https://management.azure.com/subscriptions/{0}/resourcegroups/{1}/providers/{2}/{3}/{4}?api-version=$apiversion" -f $alertinfo[2],$alertinfo[4], $alertinfo[6], $alertinfo[7], $alertinfo[8]
                        $bodyAction=@"
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
                $alertinfo=$alert.id.split("/")
                Write-Host "Running $action for $($alertinfo[8]) alert."
                Remove-AzResource -ResourceId $alert.id -Force
            }
        }
        default {
            Write-Host "Invalid Action"
        }
    }
}
else
{
    Write-Host "No alerts provided."
}
$body = "This HTTP triggered function executed successfully. $($alerts.count) were altered ($action)."

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = [HttpStatusCode]::OK
    Body = $body
})
