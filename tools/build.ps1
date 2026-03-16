<#
.SYNOPSIS
    Builds all deployment artifacts for Azure Monitor Starter Packs.

.DESCRIPTION
    Zips pack definitions, Grafana dashboards, Function App code, discovery scripts,
    client applications, modules, and compiles Bicep templates. Produces a summary
    of all artifacts created.

.EXAMPLE
    .\tools\build.ps1
#>
$ErrorActionPreference = 'Stop'
$buildErrors = @()
$artifacts = @()
$startTime = Get-Date
$repoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "========================================"
Write-Host "Azure Monitor Starter Packs - Build"
Write-Host "========================================"
Write-Host "Repo root: $repoRoot"
Write-Host ""

function Add-Artifact {
    param([string]$Path)
    $script:artifacts += $Path
}

# --- Pack definition JSON files ---
Write-Host "[1/8] Zipping pack definition JSON files..."
try {
    $packsDir = Join-Path $repoRoot 'Packs'
    $packsFiles = Get-ChildItem -Path $packsDir -Filter '*.json' -File
    foreach ($file in $packsFiles) {
        $destPath = Join-Path $packsDir ($file.BaseName + '.zip')
        Compress-Archive -Path $file.FullName -DestinationPath $destPath -Force
        Add-Artifact $destPath
    }
    Write-Host "  OK: $($packsFiles.Count) pack file(s) zipped."
}
catch {
    $buildErrors += "Pack definitions: $($_.Exception.Message)"
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# --- Grafana Dashboards (Managed Grafana) ---
Write-Host "[2/8] Zipping Grafana dashboards..."
try {
    $dashDir = Join-Path $repoRoot 'Packs\dashboards'
    if (Test-Path $dashDir) {
        $destPath = Join-Path $dashDir 'Grafana.zip'
        Remove-Item $destPath -ErrorAction SilentlyContinue
        $grafanaFiles = Get-ChildItem -Path $dashDir -Recurse -Include 'grafana*.json'
        if ($grafanaFiles.Count -gt 0) {
            foreach ($file in $grafanaFiles) {
                Compress-Archive -Path $file.FullName -DestinationPath $destPath -Update
            }
            Add-Artifact $destPath
            Write-Host "  OK: $($grafanaFiles.Count) dashboard file(s) zipped."
        }
        else {
            Write-Host "  SKIP: No grafana dashboard files found."
        }
    }
    else {
        Write-Host "  SKIP: Packs/dashboards directory not found."
    }
}
catch {
    $buildErrors += "Grafana dashboards: $($_.Exception.Message)"
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# --- AMGD Dashboards ---
Write-Host "[3/8] Zipping AMGD dashboards..."
try {
    $amgdDir = Join-Path $repoRoot 'Packs\AMGD'
    if (Test-Path $amgdDir) {
        $destPath = Join-Path $amgdDir 'amgd.zip'
        Remove-Item $destPath -ErrorAction SilentlyContinue
        $grafanaFiles = Get-ChildItem -Path $amgdDir -Recurse -Include 'grafana*.json'
        if ($grafanaFiles.Count -gt 0) {
            foreach ($file in $grafanaFiles) {
                Compress-Archive -Path $file.FullName -DestinationPath $destPath -Update
            }
            Add-Artifact $destPath
            Write-Host "  OK: $($grafanaFiles.Count) AMGD dashboard file(s) zipped."
        }
        else {
            Write-Host "  SKIP: No AMGD dashboard files found."
        }
    }
    else {
        Write-Host "  SKIP: Packs/AMGD directory not found."
    }
}
catch {
    $buildErrors += "AMGD dashboards: $($_.Exception.Message)"
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# --- Function App code ---
Write-Host "[4/9] Zipping Function App code..."
try {
    $funcDir = Join-Path $repoRoot 'setup\backend\Function\code'
    if (-not (Test-Path $funcDir)) {
        throw "Function code directory not found: $funcDir"
    }
    $destPath = Join-Path $repoRoot 'setup\backend\backend.zip'
    Remove-Item $destPath -ErrorAction SilentlyContinue
    Push-Location $funcDir
    try {
        Compress-Archive -Path * -DestinationPath $destPath -Force
    }
    finally {
        Pop-Location
    }
    Add-Artifact $destPath
    Write-Host "  OK: backend.zip created."
}
catch {
    $buildErrors += "Function App code: $($_.Exception.Message)"
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# --- Admin Portal SPA ---
Write-Host "[5/9] Building Admin Portal SPA..."
try {
    $portalDir = Join-Path $repoRoot 'portal'
    if (-not (Test-Path $portalDir)) {
        Write-Host "  SKIP: portal directory not found."
    }
    elseif (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        # npm/Node.js not available — check for a pre-built dist folder
        $distDir = Join-Path $portalDir 'dist'
        if (Test-Path $distDir) {
            $destPath = Join-Path $repoRoot 'setup' 'backend' 'portal.zip'
            Remove-Item $destPath -ErrorAction SilentlyContinue
            Push-Location $distDir
            try {
                Compress-Archive -Path * -DestinationPath $destPath -Force
            }
            finally {
                Pop-Location
            }
            Add-Artifact $destPath
            Write-Host "  OK: portal.zip created from existing dist."
        }
        else {
            Write-Host "  SKIP: npm not found and no pre-built dist. Run 'npm ci && npx vite build' in portal/ first."
        }
    }
    else {
        Push-Location $portalDir
        try {
            Write-Host "  Installing npm dependencies..."
            npm ci --silent 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "npm ci failed with exit code $LASTEXITCODE" }

            Write-Host "  Running Vite build..."
            npx vite build 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "vite build failed with exit code $LASTEXITCODE" }
        }
        finally {
            Pop-Location
        }

        $distDir = Join-Path $portalDir 'dist'
        if (-not (Test-Path $distDir)) { throw "dist directory not found after build" }
        $destPath = Join-Path $repoRoot 'setup' 'backend' 'portal.zip'
        Remove-Item $destPath -ErrorAction SilentlyContinue
        Push-Location $distDir
        try {
            Compress-Archive -Path * -DestinationPath $destPath -Force
        }
        finally {
            Pop-Location
        }
        Add-Artifact $destPath
        Write-Host "  OK: portal.zip created."
    }
}
catch {
    $buildErrors += "Admin Portal SPA: $($_.Exception.Message)"
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# --- Discovery scripts ---
Write-Host "[6/9] Packaging discovery scripts..."
try {
    # Linux discovery
    $linuxClientDir = Join-Path $repoRoot 'setup\discovery\Linux\client'
    if (Test-Path $linuxClientDir) {
        $tarDest = Join-Path $repoRoot 'setup\discovery\Linux\discover.tar'
        Push-Location $linuxClientDir
        try {
            tar -cf $tarDest *
        }
        finally {
            Pop-Location
        }
        Add-Artifact $tarDest
        Write-Host "  OK: Linux discover.tar created."
    }
    else {
        Write-Host "  SKIP: Linux discovery client directory not found."
    }

    # Windows discovery
    $winClientDir = Join-Path $repoRoot 'setup\discovery\Windows\client'
    if (Test-Path $winClientDir) {
        $zipDest = Join-Path $repoRoot 'setup\discovery\Windows\discover.zip'
        Remove-Item $zipDest -ErrorAction SilentlyContinue
        Compress-Archive -Path (Join-Path $winClientDir '*') -DestinationPath $zipDest -Force
        Add-Artifact $zipDest
        Write-Host "  OK: Windows discover.zip created."
    }
    else {
        Write-Host "  SKIP: Windows discovery client directory not found."
    }
}
catch {
    $buildErrors += "Discovery scripts: $($_.Exception.Message)"
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# --- Client applications for packs ---
Write-Host "[7/9] Zipping client applications..."
try {
    $packsDir = Join-Path $repoRoot 'Packs'
    $appsDir = Join-Path $packsDir 'applications'
    if (-not (Test-Path $appsDir)) {
        New-Item -ItemType Directory -Path $appsDir -Force | Out-Null
    }
    $folders = Get-ChildItem -Path $packsDir -Directory
    $clientCount = 0
    foreach ($folder in $folders) {
        $clientFolder = Join-Path $folder.FullName 'client'
        if (Test-Path $clientFolder) {
            $destPath = Join-Path $appsDir "$($folder.Name).zip"
            Remove-Item $destPath -ErrorAction SilentlyContinue
            Compress-Archive -Path (Join-Path $clientFolder '*') -DestinationPath $destPath -Force
            Add-Artifact $destPath
            $clientCount++
        }
    }
    # Zip all client apps into a single applications.zip
    $allAppsZip = Join-Path $appsDir 'applications.zip'
    Remove-Item $allAppsZip -ErrorAction SilentlyContinue
    $appZips = Get-ChildItem -Path $appsDir -Filter '*.zip' -File | Where-Object { $_.Name -ne 'applications.zip' }
    if ($appZips.Count -gt 0) {
        Compress-Archive -Path $appZips.FullName -DestinationPath $allAppsZip -Force
        Add-Artifact $allAppsZip
    }
    Write-Host "  OK: $clientCount client application(s) zipped."
}
catch {
    $buildErrors += "Client applications: $($_.Exception.Message)"
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# --- Modules zip ---
Write-Host "[8/9] Zipping Bicep modules..."
try {
    $modulesDir = Join-Path $repoRoot 'modules'
    if (-not (Test-Path $modulesDir)) {
        throw "Modules directory not found: $modulesDir"
    }
    $destPath = Join-Path $modulesDir 'modules.zip'
    Remove-Item $destPath -ErrorAction SilentlyContinue

    $alertsBicep = Join-Path $modulesDir 'alerts\*.bicep'
    $dcrsBicep = Join-Path $modulesDir 'DCRs\*.bicep'
    Compress-Archive -Path $alertsBicep -DestinationPath $destPath -Force
    Compress-Archive -Path $dcrsBicep -DestinationPath $destPath -Update
    Add-Artifact $destPath
    Write-Host "  OK: modules.zip created."
}
catch {
    $buildErrors += "Bicep modules: $($_.Exception.Message)"
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# --- Bicep build ---
Write-Host "[9/9] Compiling Bicep templates..."
try {
    $buildConfigPath = Join-Path $repoRoot 'tools\build.json'
    if (-not (Test-Path $buildConfigPath)) {
        throw "Build config not found: $buildConfigPath"
    }
    $buildConfig = Get-Content $buildConfigPath -Raw | ConvertFrom-Json
    foreach ($entry in $buildConfig) {
        $folder = Join-Path $repoRoot $entry.Folder
        if (-not (Test-Path $folder)) {
            throw "Bicep folder not found: $folder"
        }
        $bicepFile = Join-Path $folder $entry.File
        if (-not (Test-Path $bicepFile)) {
            throw "Bicep file not found: $bicepFile"
        }
        Push-Location $folder
        try {
            bicep build $entry.File
            $jsonOutput = Join-Path $folder ($entry.File -replace '\.bicep$', '.json')
            Add-Artifact $jsonOutput
            Write-Host "  OK: $($entry.File) compiled."
        }
        finally {
            Pop-Location
        }
    }
}
catch {
    $buildErrors += "Bicep compilation: $($_.Exception.Message)"
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# --- Summary ---
$elapsed = (Get-Date) - $startTime
Write-Host ""
Write-Host "========================================"
Write-Host "Build Summary"
Write-Host "========================================"
Write-Host "Artifacts produced: $($artifacts.Count)"
foreach ($a in $artifacts) {
    $size = if (Test-Path $a) { "{0:N0} KB" -f ((Get-Item $a).Length / 1KB) } else { "MISSING" }
    $relativePath = $a.Replace($repoRoot + '\', '')
    Write-Host "  $relativePath ($size)"
}
Write-Host ""
Write-Host "Elapsed: $($elapsed.TotalSeconds.ToString('F1'))s"

if ($buildErrors.Count -gt 0) {
    Write-Host ""
    Write-Host "ERRORS ($($buildErrors.Count)):" -ForegroundColor Red
    foreach ($err in $buildErrors) {
        Write-Host "  - $err" -ForegroundColor Red
    }
    exit 1
}
else {
    Write-Host "Build completed successfully." -ForegroundColor Green
    exit 0
}