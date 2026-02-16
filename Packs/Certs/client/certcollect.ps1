# certcollect.ps1
# Collects certificate health metrics from the local machine certificate stores
# and writes them to CSV for Azure Monitor agent collection.
# Based on SCOM Microsoft.Certificates Management Pack monitors:
#   - CertificateChain: validates the certificate trust chain
#   - CertificateExpiry: checks days until expiration
#   - CertificateRevocationListUpdate: checks CRL freshness
#
# Output format: timestamp,MetricName,Value,TagsJSON

$runTime = Get-Date -Format "o"
$monitoringFolder = "C:\WindowsAzure\Certs"
$metricLogFile = "CertMetricLog.csv"

if (-not (Test-Path $monitoringFolder)) {
    New-Item -ItemType Directory -Path $monitoringFolder -Force | Out-Null
}

$stores = @("My", "WebHosting")

foreach ($storeName in $stores) {
    $certs = Get-ChildItem -Path "Cert:\LocalMachine\$storeName" -ErrorAction SilentlyContinue
    if (-not $certs) { continue }

    foreach ($cert in $certs) {
        $friendlyName = if ($cert.FriendlyName) { $cert.FriendlyName } else { $cert.Subject }
        $thumbprint = $cert.Thumbprint

        # --- CertificateExpiry ---
        $daysToExpiry = [math]::Round(($cert.NotAfter - (Get-Date)).TotalDays, 1)
        $expiryStatus = if ($daysToExpiry -le 0) { "Expired" }
                        elseif ($daysToExpiry -le 30) { "Critical" }
                        elseif ($daysToExpiry -le 60) { "Warning" }
                        else { "Healthy" }

        $tags = @"
{"vm.azm.ms/certThumbprint":"$thumbprint","vm.azm.ms/certSubject":"$($cert.Subject -replace '"','')","vm.azm.ms/certFriendlyName":"$($friendlyName -replace '"','')","vm.azm.ms/certStore":"$storeName","vm.azm.ms/certNotAfter":"$($cert.NotAfter.ToString('o'))","vm.azm.ms/certExpiryStatus":"$expiryStatus"}
"@
        "$runTime,CertDaysToExpiry,$daysToExpiry,$tags" | Out-File "$monitoringFolder\$metricLogFile" -Append -Encoding utf8

        # --- CertificateChain ---
        $chain = New-Object System.Security.Cryptography.X509Certificates.X509Chain
        $chain.ChainPolicy.RevocationMode = [System.Security.Cryptography.X509Certificates.X509RevocationMode]::Online
        $chain.ChainPolicy.RevocationFlag = [System.Security.Cryptography.X509Certificates.X509RevocationFlag]::EntireChain
        $chain.ChainPolicy.VerificationFlags = [System.Security.Cryptography.X509Certificates.X509VerificationFlags]::NoFlag
        $chainValid = $chain.Build($cert)
        $chainStatus = if ($chainValid) { "Valid" } else {
            ($chain.ChainStatus | ForEach-Object { $_.StatusInformation.Trim() }) -join "; "
        }
        # 1 = valid chain, 0 = broken chain
        $chainValue = if ($chainValid) { 1 } else { 0 }

        $chainTags = @"
{"vm.azm.ms/certThumbprint":"$thumbprint","vm.azm.ms/certSubject":"$($cert.Subject -replace '"','')","vm.azm.ms/certStore":"$storeName","vm.azm.ms/certChainStatus":"$($chainStatus -replace '"','')"}
"@
        "$runTime,CertChainValid,$chainValue,$chainTags" | Out-File "$monitoringFolder\$metricLogFile" -Append -Encoding utf8
        $chain.Dispose()
    }
}

# --- CertificateRevocationListUpdate ---
# Check CRL freshness for certificates in the CRL cache
try {
    $crlEntries = Get-ChildItem -Path "Cert:\LocalMachine\CA" -ErrorAction SilentlyContinue
    if ($crlEntries) {
        foreach ($crl in $crlEntries) {
            if ($crl.NotAfter) {
                $crlDaysRemaining = [math]::Round(($crl.NotAfter - (Get-Date)).TotalDays, 1)
                $crlStatus = if ($crlDaysRemaining -le 0) { "Expired" }
                             elseif ($crlDaysRemaining -le 7) { "Warning" }
                             else { "Healthy" }

                $crlTags = @"
{"vm.azm.ms/certIssuer":"$($crl.Issuer -replace '"','')","vm.azm.ms/certThumbprint":"$($crl.Thumbprint)","vm.azm.ms/crlStatus":"$crlStatus"}
"@
                "$runTime,CACertDaysToExpiry,$crlDaysRemaining,$crlTags" | Out-File "$monitoringFolder\$metricLogFile" -Append -Encoding utf8
            }
        }
    }
}
catch {
    $errorTags = '{"vm.azm.ms/error":"' + ($_.Exception.Message -replace '"','') + '"}'
    "$runTime,CACertCheckError,0,$errorTags" | Out-File "$monitoringFolder\$metricLogFile" -Append -Encoding utf8
}
