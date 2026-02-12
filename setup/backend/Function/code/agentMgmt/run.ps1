
using namespace System.Net

param($Request, $TriggerMetadata)

Write-Host "PowerShell HTTP trigger function processed a request."

$resources = $Request.Body.Resources
$action = $Request.Body.Action

if ($resources) {
    Write-Host "Working on $($resources.count) resource(s). Action: $action. Altering AMA configuration."
    switch ($action) {
        'AddAgent' {
            foreach ($resource in $resources) {
                Write-Host "Running $action for $($resource.id) resource."
                Add-Agent -resourceId $resource.id -ResourceOS $resource.OSType -location $resource.location
            }
        }
        'RemoveAgent' {
            foreach ($resource in $resources) {
                Write-Host "Running $action for $($resource.id) resource."
                Remove-Agent -resourceId $resource.id -ResourceOS $resource.OSType -location $resource.location
            }
        }
        default {
            Write-Host "Invalid Action"
        }
    }
}
else
{
    Write-Host "No resources provided."
}
$body = "This HTTP triggered function executed successfully. $($resources.count) were altered ($action)."

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = [HttpStatusCode]::OK
    Body = $body
})
