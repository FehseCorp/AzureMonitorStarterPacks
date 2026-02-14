$Folder = "C:\WindowsAzure\Certs"
$TaskName = "Certificate Collection Task"
$TaskFileName = "certcollectiontask.xml"
if (-not (Test-Path $Folder)) {
    New-Item -ItemType Directory -Path $Folder -Force | Out-Null
}
Copy-Item certcollect.ps1 $Folder
Register-ScheduledTask -Xml (Get-Content ./$TaskFileName | Out-String) -TaskName "$TaskName" -Force -User System -TaskPath "\"
