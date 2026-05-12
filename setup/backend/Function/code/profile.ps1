# Azure Functions profile.ps1
#
# This profile.ps1 will get executed every "cold start" of your Function App.
# "cold start" occurs when:
#
# * A Function App starts up for the very first time
# * A Function App starts up after being de-allocated due to inactivity
#
# You can define helper functions, run commands, or specify environment variables
# NOTE: any variables defined that are not environment variables will get reset after the first execution

# Authenticate with Azure PowerShell using MSI.
# Remove this if you are not planning on using MSI or Azure PowerShell.
if ($env:MSI_SECRET) {
    Disable-AzContextAutosave -Scope Process | Out-Null
    Connect-AzAccount -Identity -AccountId $env:MSI_CLIENT_ID 
}

# Uncomment the next line to enable legacy AzureRm alias in Azure PowerShell.
# Enable-AzureRmAlias

# You can also define functions or aliases that can be referenced in any of your PowerShell functions.

# ── Ensure queue and table exist for the async PaaS job system ────────────────
# Uses Az.Storage resource-management cmdlets (not entity-level SDK types).
try {
    $storageConn = $env:AzureWebJobsStorage
    if (-not [string]::IsNullOrEmpty($storageConn)) {
        $ctx = New-AzStorageContext -ConnectionString $storageConn
        if (-not (Get-AzStorageQueue -Name 'packmgmt-work' -Context $ctx -ErrorAction SilentlyContinue)) {
            New-AzStorageQueue -Name 'packmgmt-work' -Context $ctx | Out-Null
            Write-Host 'profile.ps1: Created queue packmgmt-work'
        }
        if (-not (Get-AzStorageTable -Name 'packmgmtjobs' -Context $ctx -ErrorAction SilentlyContinue)) {
            New-AzStorageTable -Name 'packmgmtjobs' -Context $ctx | Out-Null
            Write-Host 'profile.ps1: Created table packmgmtjobs'
        }
    }
} catch {
    Write-Warning "profile.ps1: Could not ensure storage resources: $($_.Exception.Message)"
}
# ─────────────────────────────────────────────────────────────────────────────