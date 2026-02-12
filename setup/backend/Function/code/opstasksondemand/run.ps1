using namespace System.Net

param($Request, $TriggerMetadata)

Write-Host "PowerShell HTTP trigger function processed a request."
Write-Host "Request Body: $($Request.Body | ConvertTo-Json -Depth 10)"

$TaskNames = $Request.Body.TaskNames
if ([string]::IsNullOrEmpty($TaskNames)) {
    Write-Host "No TaskNames provided. Running all tasks."
    $TaskNames = @("All")
}
else {
    Write-Host "TaskNames provided: $($TaskNames -join ', ')"
}

try {
    start-opstasks -TaskNames $TaskNames
    $body="OK"
}catch {
    Write-Host "Error in start-opstasks. $_"
    $body = "Error in start-opstasks. $_"
}

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = [HttpStatusCode]::OK
    Body       = $body
})