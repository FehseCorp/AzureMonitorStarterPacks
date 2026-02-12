param($Timer)

$currentUTCtime = (Get-Date).ToUniversalTime()

if ($Timer.IsPastDue) {
    Write-Host "PowerShell timer is running late!"
}

$instanceName = $env:InstanceName
if ($instanceName) {
    get-discoveryresults -instanceName $instanceName
}
else {
    Write-Host "No instance name provided."
}

Write-Host "PowerShell timer trigger function ran! TIME: $currentUTCtime"
