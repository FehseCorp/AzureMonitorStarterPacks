# adcollect.ps1
# This script collects ADDS metrics and writes them to a file
# The file is then collected by the Azure Monitor agent and sent to Azure Monitor
# Based on the Microsoft Windows Server AD 2016 SCOM Management Pack monitors.

$runTime = Get-Date -Format "o"
$monitoringFolder = "C:\WindowsAzure\ADDS"
$ADMetricLogfile = "AdMetricLog.csv"

if (-not (Test-Path $monitoringFolder)) {
    New-Item -ItemType Directory -Path $monitoringFolder -Force | Out-Null
}

# Helper: write a metric line to the CSV
function Write-Metric {
    param([string]$Name, $Value, [string]$TagsJson)
    "$runTime,$Name,$Value,$TagsJson" | Out-File "$monitoringFolder\$ADMetricLogfile" -Append -Encoding utf8
}

# ============================================================
# Existing checks (kept from v1.0.0)
# ============================================================

# --- AD Log File Drive Disk Space ---
try {
    $LogFileRegKey = "HKLM:\SYSTEM\CurrentControlSet\Services\NTDS\Parameters\"
    $sPathLog = (Get-ItemProperty -Path $LogFileRegKey -Name "Database log files path" -ErrorAction Stop)."Database log files path"
    $volinfo = Get-Volume -DriveLetter $sPathLog[0]
    $pctFree = [math]::Round($volinfo.SizeRemaining / $volinfo.Size * 100, 2)
    $tags = @"
{"vm.azm.ms/mountId":"$($volinfo.DriveLetter):","vm.azm.ms/volSize":"$($volinfo.Size)","vm.azm.ms/logFilePath":"$sPathLog"}
"@
    Write-Metric -Name "ADLogFileDriveDiskSpacePctUsed" -Value $pctFree -TagsJson $tags
} catch { Write-Metric -Name "ADLogFileDriveError" -Value 0 -TagsJson "{`"vm.azm.ms/error`":`"$($_.Exception.Message -replace '"','')`"}" }

# --- AD DIT Drive Disk Space ---
try {
    $sPathDIT = (Get-ItemProperty -Path $LogFileRegKey -Name "DSA Database File" -ErrorAction Stop)."DSA Database File"
    $volinfo = Get-Volume -DriveLetter $sPathDIT[0]
    $pctFree = [math]::Round($volinfo.SizeRemaining / $volinfo.Size * 100, 2)
    $tags = @"
{"vm.azm.ms/mountId":"$($volinfo.DriveLetter):","vm.azm.ms/volSize":"$($volinfo.Size)","vm.azm.ms/logFilePath":"$sPathDIT"}
"@
    Write-Metric -Name "ADDSADDBDrivePctFree" -Value $pctFree -TagsJson $tags
} catch { Write-Metric -Name "ADDITDriveError" -Value 0 -TagsJson "{`"vm.azm.ms/error`":`"$($_.Exception.Message -replace '"','')`"}" }

# --- AD DIT File Size ---
try {
    $sPathDIT = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\NTDS\Parameters\" -Name "DSA Database File" -ErrorAction Stop)."DSA Database File"
    $fileSize = (Get-Item $sPathDIT).Length
    $volinfo = Get-Volume -DriveLetter $sPathDIT[0]
    $tags = @"
{"vm.azm.ms/mountId":"$($volinfo.DriveLetter):","vm.azm.ms/logFilePath":"$sPathDIT"}
"@
    Write-Metric -Name "ADDitFileSize" -Value $fileSize -TagsJson $tags
} catch { }

# --- Lost & Found Object Count ---
try {
    $oRoot = [adsi]"LDAP://rootdse"
    $strDNSDomain = $oRoot.defaultNamingContext
    $Provider = "ADsDSOObject"
    $oCmdText = "Select Name From 'LDAP://CN=LostAndFound,$strDNSDomain'"
    $oConnection = New-Object -ComObject "ADODB.Connection"
    $oConnection.Provider = $Provider
    $oConnection.Open("Active Directory Provider")
    $oCommand = New-Object -ComObject "ADODB.Command"
    $oCommand.CommandText = $oCmdText
    $oCommand.ActiveConnection = $oConnection
    $RecordCount = ($oCommand.Execute()).RecordCount
    $tags = @"
{"vm.azm.ms/ADLFDomain":"$strDNSDomain"}
"@
    Write-Metric -Name "ADDSLFObjCount" -Value $RecordCount -TagsJson $tags
} catch { }

# --- LSASS CPU ---
try {
    $cpu = 0
    for ($i = 0; $i -lt 5; $i++) {
        $cpu += [math]::Round((Get-Process lsass -ComputerName . | Select-Object -ExpandProperty CPU))
        Start-Sleep -Seconds 1
    }
    $totalcpu = $cpu / 5
    $tags = @"
{"vm.azm.ms/ADlsasscpu":"lsass"}
"@
    Write-Metric -Name "ADDSlsassCPU" -Value $totalcpu -TagsJson $tags
} catch { }

# ============================================================
# New checks (v1.1.0) — converted from SCOM VBScript monitors
# ============================================================

# --- AD Replication Health ---
# Replaces: Replication.Queue, ReplicationPartnerCount, ReplicationShowReplCheck, ReplicationConsistency
try {
    Import-Module ActiveDirectory -ErrorAction Stop

    # Replication partner status
    $partners = Get-ADReplicationPartnerMetadata -Target $env:COMPUTERNAME -ErrorAction SilentlyContinue
    if ($partners) {
        foreach ($p in $partners) {
            $failures = if ($p.ConsecutiveReplicationFailures) { $p.ConsecutiveReplicationFailures } else { 0 }
            $partnerName = ($p.Partner -split ',')[1] -replace 'CN=',''
            $tags = @"
{"vm.azm.ms/replPartner":"$partnerName","vm.azm.ms/replPartition":"$($p.Partition)","vm.azm.ms/lastSuccess":"$($p.LastReplicationSuccess)"}
"@
            Write-Metric -Name "ADReplConsecutiveFailures" -Value $failures -TagsJson $tags
        }
    }

    # Replication queue (pending operations)
    try {
        $replQueue = Get-WmiObject -Namespace "root\MicrosoftActiveDirectory" -Class "MSAD_ReplPendingOp" -ErrorAction SilentlyContinue
        $pendingOps = if ($replQueue) { @($replQueue).Count } else { 0 }
        Write-Metric -Name "ADReplPendingOps" -Value $pendingOps -TagsJson "{}"
    } catch {
        Write-Metric -Name "ADReplPendingOps" -Value 0 -TagsJson "{}"
    }
} catch { }

# --- AD Time Skew ---
# Replaces: TimeSkew monitor (threshold: 120 seconds)
try {
    $domain = Get-ADDomain -ErrorAction Stop
    $pdcEmulator = $domain.PDCEmulator
    $w32tmOutput = & w32tm /stripchart /computer:$pdcEmulator /dataonly /samples:1 2>&1
    $skewLine = $w32tmOutput | Select-String -Pattern '([+-]?\d+\.\d+)s' | Select-Object -Last 1
    if ($skewLine -and $skewLine.Matches[0].Groups[1].Value) {
        $skewSeconds = [math]::Abs([double]$skewLine.Matches[0].Groups[1].Value)
    } else {
        $skewSeconds = 0
    }
    $tags = @"
{"vm.azm.ms/pdcEmulator":"$pdcEmulator"}
"@
    Write-Metric -Name "ADTimeSkew" -Value $skewSeconds -TagsJson $tags
} catch { }

# --- AD LDAP Bind Availability & Performance ---
# Replaces: Availability.Bind, Performance.BindTimes
try {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $root = [adsi]"LDAP://RootDSE"
    $null = $root.defaultNamingContext
    $sw.Stop()
    $bindSuccess = if ($root.defaultNamingContext) { 1 } else { 0 }
    $bindTimeMs = $sw.ElapsedMilliseconds
    Write-Metric -Name "ADBindSuccess" -Value $bindSuccess -TagsJson "{}"
    Write-Metric -Name "ADBindTimeMs" -Value $bindTimeMs -TagsJson "{}"
} catch {
    Write-Metric -Name "ADBindSuccess" -Value 0 -TagsJson "{`"vm.azm.ms/error`":`"$($_.Exception.Message -replace '"','')`"}"
}

# --- AD Global Catalog Response ---
# Replaces: Availability.GCResponse, Performance.GCResponse (warn: 5s, error: 10s)
try {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $gc = [adsi]"GC://RootDSE"
    $null = $gc.defaultNamingContext
    $sw.Stop()
    $gcReachable = if ($gc.defaultNamingContext) { 1 } else { 0 }
    $gcResponseMs = $sw.ElapsedMilliseconds
    Write-Metric -Name "ADGCReachable" -Value $gcReachable -TagsJson "{}"
    Write-Metric -Name "ADGCResponseMs" -Value $gcResponseMs -TagsJson "{}"
} catch {
    Write-Metric -Name "ADGCReachable" -Value 0 -TagsJson "{`"vm.azm.ms/error`":`"$($_.Exception.Message -replace '"','')`"}"
}

# --- AD FSMO Role Holder Health ---
# Replaces: 10 FsmoBind + 5 FsmoPing + 5 FsmoConsistency monitors
try {
    $domain = Get-ADDomain -ErrorAction Stop
    $forest = Get-ADForest -ErrorAction Stop

    $fsmoRoles = @{
        'PDCEmulator'         = $domain.PDCEmulator
        'RIDMaster'           = $domain.RIDMaster
        'InfrastructureMaster'= $domain.InfrastructureMaster
        'SchemaMaster'        = $forest.SchemaMaster
        'DomainNamingMaster'  = $forest.DomainNamingMaster
    }

    foreach ($role in $fsmoRoles.GetEnumerator()) {
        $reachable = 0
        try {
            $result = Test-Connection -ComputerName $role.Value -Count 1 -Quiet -ErrorAction Stop
            if ($result) { $reachable = 1 }
        } catch { }
        $tags = @"
{"vm.azm.ms/fsmoRole":"$($role.Key)","vm.azm.ms/fsmoHolder":"$($role.Value)"}
"@
        Write-Metric -Name "ADFSMOReachable" -Value $reachable -TagsJson $tags
    }
} catch { }

# --- AD Trust Validation ---
# Replaces: AD_Monitor_Trusts
try {
    $trusts = Get-ADTrust -Filter * -ErrorAction SilentlyContinue
    if ($trusts) {
        foreach ($trust in $trusts) {
            $valid = 0
            try {
                $testResult = & netdom trust $trust.Name /verify 2>&1
                if ($LASTEXITCODE -eq 0) { $valid = 1 }
            } catch { }
            $dirText = switch ($trust.Direction) { 0 { "Disabled" } 1 { "Inbound" } 2 { "Outbound" } 3 { "Bidirectional" } default { "Unknown" } }
            $tags = @"
{"vm.azm.ms/trustName":"$($trust.Name)","vm.azm.ms/trustDirection":"$dirText","vm.azm.ms/trustType":"$($trust.TrustType)"}
"@
            Write-Metric -Name "ADTrustValid" -Value $valid -TagsJson $tags
        }
    }
} catch { }

# --- AD RID Pool Free ---
# Replaces: RIDPool.Free
try {
    $domain = Get-ADDomain -ErrorAction Stop
    $ridManager = Get-ADObject "CN=RID Manager$,CN=System,$($domain.DistinguishedName)" -Properties rIDAvailablePool -ErrorAction Stop
    $ridPool = $ridManager.rIDAvailablePool
    $currentRIDPoolCount = [int]($ridPool -band 0xFFFFFFFF)
    $maxRIDPoolCount = [int]($ridPool -shr 32)
    $freeRIDs = $maxRIDPoolCount - $currentRIDPoolCount
    $tags = @"
{"vm.azm.ms/ridCurrent":"$currentRIDPoolCount","vm.azm.ms/ridMax":"$maxRIDPoolCount"}
"@
    Write-Metric -Name "ADRIDPoolFree" -Value $freeRIDs -TagsJson $tags
} catch { }

# --- AD SYSVOL / NETLOGON Share ---
# Replaces: Availability.SysVol
try {
    $sysvolOk = if (Test-Path "\\$env:COMPUTERNAME\SYSVOL") { 1 } else { 0 }
    Write-Metric -Name "ADSysVolAccessible" -Value $sysvolOk -TagsJson '{"vm.azm.ms/shareName":"SYSVOL"}'

    $netlogonOk = if (Test-Path "\\$env:COMPUTERNAME\NETLOGON") { 1 } else { 0 }
    Write-Metric -Name "ADNetLogonAccessible" -Value $netlogonOk -TagsJson '{"vm.azm.ms/shareName":"NETLOGON"}'
} catch { }

# --- AD Group Policy Check ---
# Replaces: Configuration.GroupPolicy
try {
    $gpResult = & gpresult /R /SCOPE COMPUTER 2>&1
    $gpOk = if ($LASTEXITCODE -eq 0 -and ($gpResult | Select-String "Applied Group Policy Objects")) { 1 } else { 0 }
    Write-Metric -Name "ADGroupPolicyOk" -Value $gpOk -TagsJson "{}"
} catch {
    Write-Metric -Name "ADGroupPolicyOk" -Value 0 -TagsJson "{}"
}

# --- AD ATQ Thread Usage ---
# Replaces: Performance.Atq.AvgThreads (warn: 80%, error: 90%)
try {
    $ntdsPerf = Get-WmiObject -Class Win32_PerfFormattedData_NTDS_NTDS -ErrorAction Stop
    if ($ntdsPerf) {
        $threadsTotal = [int]$ntdsPerf.ATQThreadsTotal
        $threadsLDAP = [int]$ntdsPerf.ATQThreadsLDAP
        $threadsOther = [int]$ntdsPerf.ATQThreadsOther
        $processors = (Get-WmiObject Win32_Processor | Measure-Object -Property NumberOfLogicalProcessors -Sum).Sum
        $maxThreads = $processors * 4
        $usagePct = if ($maxThreads -gt 0) { [math]::Round(($threadsTotal / $maxThreads) * 100, 1) } else { 0 }
        $tags = @"
{"vm.azm.ms/atqTotal":"$threadsTotal","vm.azm.ms/atqLDAP":"$threadsLDAP","vm.azm.ms/atqOther":"$threadsOther","vm.azm.ms/atqMax":"$maxThreads"}
"@
        Write-Metric -Name "ADAtqThreadUsagePct" -Value $usagePct -TagsJson $tags
    }
} catch { }
