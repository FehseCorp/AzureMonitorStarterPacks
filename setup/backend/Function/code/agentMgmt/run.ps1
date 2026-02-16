
using namespace System.Net

param($Request, $TriggerMetadata)

Write-Host "agentMgmt: PowerShell HTTP trigger function processed a request."

$resources = $Request.Body.Resources
$action = $Request.Body.Action
$statusCode = [HttpStatusCode]::OK

if ([string]::IsNullOrEmpty($action)) {
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::BadRequest
        Body = '{"error": "Missing required field: Action"}'
    })
    return
}

if (-not $resources -or $resources.Count -eq 0) {
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::BadRequest
        Body = '{"error": "Missing or empty required field: Resources"}'
    })
    return
}

try {
    Write-Host "agentMgmt: Working on $($resources.count) resource(s). Action: $action."
    switch ($action) {
        'AddAgent' {
            foreach ($resource in $resources) {
                Write-Host "agentMgmt: Running $action for $($resource.id)."
                Add-Agent -resourceId $resource.id -ResourceOS $resource.OSType -location $resource.location
            }
        }
        'RemoveAgent' {
            foreach ($resource in $resources) {
                Write-Host "agentMgmt: Running $action for $($resource.id)."
                Remove-Agent -resourceId $resource.id -ResourceOS $resource.OSType -location $resource.location
            }
        }
        default {
            $statusCode = [HttpStatusCode]::BadRequest
            $body = "{""error"": ""Invalid action: $action. Valid actions are: AddAgent, RemoveAgent""}"
        }
    }
    if ($statusCode -eq [HttpStatusCode]::OK) {
        $body = "Successfully processed $($resources.count) resource(s) with action '$action'."
    }
}
catch {
    Write-Host "agentMgmt: Error processing action '$action': $_"
    $statusCode = [HttpStatusCode]::InternalServerError
    $body = "{""error"": ""Error processing action '$action': $($_.Exception.Message)""}"
}

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = $statusCode
    Body = $body
})
