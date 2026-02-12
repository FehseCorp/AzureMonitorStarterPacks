using namespace System.Net

param($Request, $TriggerMetadata)

Write-Host "opstasksondemand: PowerShell HTTP trigger function processed a request."
Write-Host "opstasksondemand: Request Body: $($Request.Body | ConvertTo-Json -Depth 10)"

$TaskNames = $Request.Body.TaskNames
if ([string]::IsNullOrEmpty($TaskNames)) {
    Write-Host "opstasksondemand: No TaskNames provided. Running all tasks."
    $TaskNames = @("All")
}
else {
    Write-Host "opstasksondemand: TaskNames provided: $($TaskNames -join ', ')"
}

$statusCode = [HttpStatusCode]::OK
try {
    start-opstasks -TaskNames $TaskNames
    $body = "OK"
}
catch {
    Write-Host "opstasksondemand: Error in start-opstasks: $_"
    $statusCode = [HttpStatusCode]::InternalServerError
    $body = "{""error"": ""Error in start-opstasks: $($_.Exception.Message)""}"
}

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = $statusCode
    Body       = $body
})