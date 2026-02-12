param($Timer)

$currentUTCtime = (Get-Date).ToUniversalTime()

if ($Timer.IsPastDue) {
    Write-Host "runDiscovery: PowerShell timer is running late!"
}

$instanceName = $env:InstanceName
if ($instanceName) {
    try {
        get-discoveryresults -instanceName $instanceName
    }
    catch {
        Write-Host "runDiscovery: Error running discovery for instance '$instanceName': $_"
    }
}
else {
    Write-Host "runDiscovery: No instance name provided. Skipping discovery."
}

Write-Host "runDiscovery: Timer trigger completed. TIME: $currentUTCtime"
