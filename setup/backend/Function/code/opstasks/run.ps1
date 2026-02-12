param($Timer)

$currentUTCtime = (Get-Date).ToUniversalTime()

if ($Timer.IsPastDue) {
    Write-Host "opstasks: PowerShell timer is running late!"
}

try {
    start-opstasks
}
catch {
    Write-Host "opstasks: Error running ops tasks: $_"
}

Write-Host "opstasks: Timer trigger completed. TIME: $currentUTCtime"
