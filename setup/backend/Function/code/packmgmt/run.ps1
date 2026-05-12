using namespace System.Net

param($Request, $TriggerMetadata)

$instanceName = $env:InstanceName
$InformationPreference = 'SilentlyContinue'

Write-Host "packmgmt: PowerShell HTTP trigger function processed a request."

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

# Helper: enqueue PaaS work and return 202 immediately.
# Uses Azure Functions output bindings (Push-OutputBinding) so no SDK type
# instantiation is needed — the Functions runtime handles all storage calls.
function Submit-PaaSJob {
    param(
        [string]$Action,         # AddPack | RemoveTag
        [array]$Resources,
        [string]$TagName,
        [string]$DefaultAG,
        [string]$WorkspaceId,
        [string]$AzureMonitorWorkspaceId
    )
    $jobId = [System.Guid]::NewGuid().ToString()

    # Write job metadata row via table output binding (defined in function.json)
    Push-OutputBinding -Name jobTable -Value @{
        partitionKey = $jobId
        rowKey       = '_job'
        Total        = [int]$Resources.Count
        Action       = $Action
        Status       = 'Queued'
    }

    # Enqueue one message per resource via queue output binding (defined in function.json)
    $seq = 0
    foreach ($resource in $Resources) {
        $msg = @{
            JobId    = $jobId
            Seq      = $seq
            Action   = $Action
            Resource = $resource.Resource
            Type     = $resource.type
            Location = $resource.location
            Tag      = $resource.tag
            TagName  = $TagName
            DefaultAG = $DefaultAG
            WorkspaceId = $WorkspaceId
            AzureMonitorWorkspaceId = $AzureMonitorWorkspaceId
            InstanceName = $instanceName
        } | ConvertTo-Json -Compress
        Push-OutputBinding -Name jobQueue -Value $msg
        $seq++
    }
    Write-Host "packmgmt: Queued $($Resources.Count) PaaS work item(s) for job $jobId."
    return $jobId
}

try {
    if ($action -eq 'importPack') {
        $newPacks = $Request.Body.PackDef | ConvertTo-Json -Depth 20
        Write-Host "packmgmt: New Packs: $newPacks"
        if ([string]::IsNullOrEmpty($newPacks)) {
            $statusCode = [HttpStatusCode]::BadRequest
            $body = '{"error": "No pack definition provided for import."}'
        }
        else {
            import-pack -packNewDefinition $newPacks
            $body = "Pack imported successfully."
        }
    }
    else {
        if ([string]::IsNullOrEmpty($Request.Body.Pack)) {
            $TagList = @()
        } else {
            $TagList = $Request.Body.Pack.split(',')
        }
        $PackType = $Request.Body.PackType
        $ResourceType = $Request.Body.Type
        $defaultAG = $Request.Body.DefaultAG
        $workspaceResourceId = $Request.Body.WorkspaceId
        $azureMonitorWorkspaceId = $Request.Body.AzureMonitorWorkspaceId

        if (-not $resources -or $resources.Count -eq 0) {
            $statusCode = [HttpStatusCode]::BadRequest
            $body = '{"error": "Missing or empty required field: Resources"}'
        }
        else {
            $TagName = $env:SolutionTag
            if ([string]::isnullorempty($TagName)) {
                $TagName = 'MonitorStarterPacks'
                Write-Host "packmgmt: Missing SolutionTag env var. Using default: $TagName"
            }
            Write-Host "packmgmt: Working on $($resources.count) resource(s). Action: $action. Tag: $TagName"
            Write-Host "packmgmt: Resources: $($resources | convertto-json -Depth 10)"
            switch ($action) {
                'AddPack' {
                    foreach ($resource in $resources) {
                        switch ($PackType) {
                            'Iaas' {
                                if ($TagList.Count -eq 0) {
                                    Write-Host "packmgmt: Taglist is null. Setting to $($resource.Pack)"
                                    $TagList = @($resource.Pack)
                                }
                                $InstallDependencyAgent = ($Taglist -contains 'SvcMap') ? $true : $false
                                if ($InstallDependencyAgent) {
                                    Write-Host "packmgmt: Will install dependency agent. Taglist=$TagList"
                                }
                                try {
                                    Add-Agent -resourceId $resource.Resource -ResourceOS $resource.OS -location $resource.Location -InstallDependencyAgent $InstallDependencyAgent
                                }
                                catch {
                                    Write-Host "packmgmt: Error installing agent on $($resource.Resource). Skipping monitoring setup. Error: $($_.Exception.Message)"
                                    continue
                                }
                                foreach ($TagValue in $TagList) {
                                    Write-Host "packmgmt: TAGMGMT adding $TagValue to $($resource.Resource). PackType=$PackType"
                                    Add-Monitoring -resourceId $resource.Resource `
                                        -TagName $TagName `
                                        -TagValue $TagValue `
                                        -instanceName $instanceName `
                                        -packType $PackType `
                                        -resourceType 'Compute' `
                                        -actionGroupId $defaultAG `
                                        -workspaceResourceId $workspaceResourceId `
                                        -azureMonitorWorkspaceId $azureMonitorWorkspaceId `
                                        -location $resource.Location
                                }
                            }
                            'Discovery' {
                                $TagValue = $resource.Pack
                                $InstallDependencyAgent = ($Taglist -contains 'SvcMap') ? $true : $false
                                if ($InstallDependencyAgent) {
                                    Write-Host "packmgmt: Will install dependency agent. Taglist=$Taglist"
                                }
                                try {
                                    Add-Agent -resourceId $resource.Resource -ResourceOS $resource.OS -location $resource.Location -InstallDependencyAgent $InstallDependencyAgent
                                }
                                catch {
                                    Write-Host "packmgmt: Error installing agent on $($resource.Resource). Skipping monitoring setup. Error: $($_.Exception.Message)"
                                    continue
                                }
                                Write-Host "packmgmt: PackType=$PackType. Adding tag for $ResourceType. TagValue=$TagValue. Resource=$($resource.Resource)"
                                Add-Monitoring -resourceId $resource.Resource `
                                    -TagName $TagName `
                                    -TagValue $TagValue `
                                    -instanceName $instanceName `
                                    -packType $PackType `
                                    -resourceType 'Compute' `
                                    -workspaceResourceId $workspaceResourceId `
                                    -azureMonitorWorkspaceId $azureMonitorWorkspaceId `
                                    -actionGroupId $defaultAG `
                                    -location $resource.Location
                            }
                            'PaaS' {
                                # PaaS work is slow (AMBA catalog fetch + many ARM calls per resource).
                                # Enqueue all resources at once and return a jobId immediately.
                                $jobId = Submit-PaaSJob `
                                    -Action 'AddPack' `
                                    -Resources $resources `
                                    -TagName $TagName `
                                    -DefaultAG $defaultAG `
                                    -WorkspaceId $workspaceResourceId `
                                    -AzureMonitorWorkspaceId $azureMonitorWorkspaceId
                                $statusCode = [HttpStatusCode]::Accepted
                                $body = @{ jobId = $jobId; total = $resources.Count } | ConvertTo-Json -Compress
                                # Break out of the foreach — Submit-PaaSJob already looped resources
                                break
                            }
                            default {
                                Write-Host "packmgmt: Invalid PackType: $PackType"
                            }
                        }
                    }
                }
                'RemoveTag' {
                    foreach ($resource in $resources) {
                        switch ($PackType) {
                            'Iaas' {
                                foreach ($TagValue in $TagList) {
                                    Write-Host "packmgmt: TAGMGMT removing $TagValue from $($resource.Resource). PackType=$PackType"
                                    Remove-Monitoring -resourceId $resource.Resource `
                                        -TagName $TagName -TagValue $TagValue `
                                        -PackType $PackType -instanceName $instanceName
                                }
                            }
                            'Discovery' {
                                $TagValue = $resource.Packs
                                Write-Host "packmgmt: PackType=$PackType. Removing tag $TagValue from $($resource.Resource)"
                                if ($TagValue -ne '') {
                                    Remove-Monitoring -resourceId $resource.Resource `
                                        -TagName $TagName `
                                        -TagValue $TagValue `
                                        -instanceName $instanceName `
                                        -packType $PackType
                                }
                                else {
                                    Write-Host "packmgmt: Error - No tag value found for $($resource.Resource)"
                                }
                            }
                            'Paas' {
                                # Enqueue removals the same way
                                $jobId = Submit-PaaSJob `
                                    -Action 'RemoveTag' `
                                    -Resources $resources `
                                    -TagName $TagName `
                                    -DefaultAG $defaultAG `
                                    -WorkspaceId $workspaceResourceId `
                                    -AzureMonitorWorkspaceId $azureMonitorWorkspaceId
                                $statusCode = [HttpStatusCode]::Accepted
                                $body = @{ jobId = $jobId; total = $resources.Count } | ConvertTo-Json -Compress
                                break
                            }
                            default {
                                Write-Host "packmgmt: Invalid PackType: $PackType"
                            }
                        }
                    }
                }
                default {
                    $statusCode = [HttpStatusCode]::BadRequest
                    $body = "{""error"": ""Invalid action: $action. Valid actions are: importPack, AddPack, RemoveTag""}"
                }
            }
            if ($statusCode -eq [HttpStatusCode]::OK -and -not $body) {
                $body = "Successfully processed $($resources.count) resource(s) with action '$action'."
            }
        }
    }
}
catch {
    Write-Host "packmgmt: Error processing action '$action': $_"
    $statusCode = [HttpStatusCode]::InternalServerError
    $body = "{""error"": ""Error processing action '$action': $($_.Exception.Message)""}"
}

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = $statusCode
    Body       = $body
})
