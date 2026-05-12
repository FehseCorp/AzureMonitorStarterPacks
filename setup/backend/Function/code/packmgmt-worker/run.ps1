param($QueueItem, $TriggerMetadata)

# Each invocation processes exactly ONE PaaS resource.
# Progress and results are written to Table Storage (packmgmtjobs).

$InformationPreference = 'Continue'

try {
    # The Functions runtime auto-deserializes JSON queue messages into a PSObject.
    # ConvertFrom-Json is only needed if the message arrives as a raw string.
    if ($QueueItem -is [string]) {
        $msg = $QueueItem | ConvertFrom-Json
    } else {
        $msg = $QueueItem
    }
} catch {
    Write-Error "packmgmt-worker: Failed to parse queue message: $($_.Exception.Message)"
    return
}

$jobId       = $msg.JobId
$resourceId  = $msg.Resource
$resourceType= $msg.Type
$location    = $msg.Location
$tagValue    = $msg.Tag
$tagName     = $msg.TagName
$defaultAG   = $msg.DefaultAG
$workspaceId = $msg.WorkspaceId
$azMWId      = $msg.AzureMonitorWorkspaceId
$instanceName= $msg.InstanceName
$action      = $msg.Action
$seq         = $msg.Seq

Write-Host "packmgmt-worker: jobId=$jobId seq=$seq action=$action resource=$resourceId"

# ── Write result row via output binding (no SDK type instantiation needed) ───
# The 'resultTable' binding is declared in function.json.
# getJobStatus derives progress by counting result rows, so no summary row update needed.
function Set-ResultRow {
    param([string]$Status, [string]$Detail = '')
    Push-OutputBinding -Name resultTable -Value @{
        partitionKey = $jobId
        rowKey       = "r$seq"
        ResourceId   = $resourceId
        Status       = $Status
        Detail       = $Detail
        Action       = $action
    }
}
# ─────────────────────────────────────────────────────────────────────────────

try {
    switch ($action) {
        'AddPack' {
            if ([string]::IsNullOrEmpty($resourceType)) {
                throw "No resource type for $resourceId"
            }
            Add-Monitoring `
                -resourceId  $resourceId `
                -TagName     $tagName `
                -TagValue    $resourceType `
                -resourceType $resourceType `
                -actionGroupId $defaultAG `
                -packtype    'PaaS' `
                -instanceName $instanceName `
                -location    $location `
                -workspaceResourceId $workspaceId `
                -azureMonitorWorkspaceId $azMWId
        }
        'RemoveTag' {
            if ([string]::IsNullOrEmpty($tagValue)) {
                throw "No tag value for $resourceId"
            }
            Remove-Monitoring `
                -resourceId  $resourceId `
                -TagName     $tagName `
                -TagValue    $tagValue `
                -PackType    'PaaS' `
                -instanceName $instanceName
        }
        default {
            throw "Unknown action: $action"
        }
    }
    Write-Host "packmgmt-worker: Succeeded for $resourceId"
    Set-ResultRow -Status 'Succeeded'
} catch {
    $errMsg = $_.Exception.Message
    Write-Error "packmgmt-worker: Failed for $resourceId : $errMsg"
    Set-ResultRow -Status 'Failed' -Detail $errMsg
    # Re-throw so the Functions runtime retries (up to maxDequeueCount=3 in host.json)
    throw
}