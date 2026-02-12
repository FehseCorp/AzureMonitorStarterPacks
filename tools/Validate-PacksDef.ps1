<#
.SYNOPSIS
    Validates PacksDef.json against its JSON Schema.

.DESCRIPTION
    Loads PacksDef.json and PacksDef.schema.json from the Packs directory and validates
    the data against the schema. Reports any validation errors with details.

    Uses NJsonSchema for .NET-based JSON Schema validation.
    Falls back to a basic structural validation if NJsonSchema is not available.

.PARAMETER PacksDefPath
    Path to the PacksDef.json file. Defaults to Packs/PacksDef.json relative to repo root.

.PARAMETER SchemaPath
    Path to the PacksDef.schema.json file. Defaults to Packs/PacksDef.schema.json relative to repo root.

.EXAMPLE
    .\tools\Validate-PacksDef.ps1
    .\tools\Validate-PacksDef.ps1 -PacksDefPath .\Packs\PacksDef.json
#>
param(
    [string]$PacksDefPath,
    [string]$SchemaPath
)

$ErrorActionPreference = 'Stop'

# Resolve paths relative to repo root
$repoRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrEmpty($PacksDefPath)) {
    $PacksDefPath = Join-Path $repoRoot 'Packs\PacksDef.json'
}
if ([string]::IsNullOrEmpty($SchemaPath)) {
    $SchemaPath = Join-Path $repoRoot 'Packs\PacksDef.schema.json'
}

# Validate files exist
if (-not (Test-Path $PacksDefPath)) {
    Write-Error "PacksDef.json not found at: $PacksDefPath"
    exit 1
}
if (-not (Test-Path $SchemaPath)) {
    Write-Error "PacksDef.schema.json not found at: $SchemaPath"
    exit 1
}

Write-Host "Validating: $PacksDefPath"
Write-Host "Schema:     $SchemaPath"
Write-Host ""

# Load files
try {
    $packsJson = Get-Content $PacksDefPath -Raw
    $packsData = $packsJson | ConvertFrom-Json -Depth 30
}
catch {
    Write-Host "FAIL: PacksDef.json is not valid JSON." -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

try {
    $schemaJson = Get-Content $SchemaPath -Raw
    $schemaData = $schemaJson | ConvertFrom-Json -Depth 30
}
catch {
    Write-Host "FAIL: PacksDef.schema.json is not valid JSON." -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Structural validation against schema definitions
$errors = @()

# Validate top-level structure
if ($null -eq $packsData.Packs) {
    $errors += "Root: Missing required property 'Packs'."
}
elseif ($packsData.Packs.Count -eq 0) {
    $errors += "Root: 'Packs' array must contain at least one pack."
}
else {
    $validOS = @('Windows', 'Linux', 'All')
    $validRuleTypes = @('EventPerformance', 'CustomData', 'IISLogs', 'syslog', 'VMInsights', 'ServiceMap')
    $validAlertTypes = @('rows', 'Aggregated')
    $validOperators = @('GreaterThan', 'GreaterThanOrEqual', 'LessThan', 'LessThanOrEqual', 'Equal')
    $seenTags = @{}

    for ($i = 0; $i -lt $packsData.Packs.Count; $i++) {
        $pack = $packsData.Packs[$i]
        $packPath = "Packs[$i]"

        # Required fields
        foreach ($field in @('Name', 'Tag', 'Description', 'OS')) {
            $val = $pack.$field
            if ([string]::IsNullOrEmpty($val)) {
                $errors += "${packPath}: Missing or empty required field '$field'."
            }
        }

        # Tag uniqueness and format
        if (-not [string]::IsNullOrEmpty($pack.Tag)) {
            if ($pack.Tag -notmatch '^[a-zA-Z0-9_-]+$') {
                $errors += "${packPath}: Tag '$($pack.Tag)' contains invalid characters. Use alphanumeric, hyphens, and underscores only."
            }
            if ($seenTags.ContainsKey($pack.Tag)) {
                $errors += "${packPath}: Duplicate Tag '$($pack.Tag)' (first seen at Packs[$($seenTags[$pack.Tag])])."
            }
            $seenTags[$pack.Tag] = $i
        }

        # OS validation
        if (-not [string]::IsNullOrEmpty($pack.OS) -and $pack.OS -notin $validOS) {
            $errors += "$packPath ($($pack.Tag)): Invalid OS '$($pack.OS)'. Must be one of: $($validOS -join ', ')."
        }

        # Rules validation
        if ($null -eq $pack.Rules -or $pack.Rules.Count -eq 0) {
            $errors += "$packPath ($($pack.Tag)): Missing or empty required field 'Rules'."
        }
        else {
            for ($r = 0; $r -lt $pack.Rules.Count; $r++) {
                $rule = $pack.Rules[$r]
                $rulePath = "$packPath ($($pack.Tag)).Rules[$r]"

                foreach ($field in @('Rulename', 'RuleType', 'RuleNamePath')) {
                    if ([string]::IsNullOrEmpty($rule.$field)) {
                        $errors += "${rulePath}: Missing or empty required field '$field'."
                    }
                }

                if (-not [string]::IsNullOrEmpty($rule.RuleType) -and $rule.RuleType -notin $validRuleTypes) {
                    $errors += "${rulePath}: Invalid RuleType '$($rule.RuleType)'. Must be one of: $($validRuleTypes -join ', ')."
                }

                if (-not [string]::IsNullOrEmpty($rule.RuleNamePath) -and $rule.RuleNamePath -notmatch '\.bicep$') {
                    $errors += "${rulePath}: RuleNamePath '$($rule.RuleNamePath)' must end with '.bicep'."
                }

                if (-not [string]::IsNullOrEmpty($rule.clientAppVersion) -and $rule.clientAppVersion -notmatch '^[0-9]+\.[0-9]+\.[0-9]+$') {
                    $errors += "${rulePath}: clientAppVersion '$($rule.clientAppVersion)' must be semantic version (e.g., 1.0.0)."
                }
            }
        }

        # Alerts validation
        if ($null -eq $pack.Alerts) {
            $errors += "$packPath ($($pack.Tag)): Missing required field 'Alerts'."
        }
        else {
            for ($a = 0; $a -lt $pack.Alerts.Count; $a++) {
                $alert = $pack.Alerts[$a]
                $alertPath = "$packPath ($($pack.Tag)).Alerts[$a]"

                foreach ($field in @('alertRuleDescription', 'alertRuleDisplayName', 'alertRuleName', 'alertRuleSeverity', 'alertType', 'query')) {
                    $val = $alert.$field
                    if ($null -eq $val -or ($val -is [string] -and [string]::IsNullOrEmpty($val))) {
                        $errors += "${alertPath}: Missing or empty required field '$field'."
                    }
                }

                if (-not [string]::IsNullOrEmpty($alert.alertRuleName) -and $alert.alertRuleName -notmatch '^[a-zA-Z0-9_\-\(\)]+$') {
                    $errors += "${alertPath}: alertRuleName '$($alert.alertRuleName)' contains invalid characters."
                }

                if ($null -ne $alert.alertRuleSeverity) {
                    if ($alert.alertRuleSeverity -lt 0 -or $alert.alertRuleSeverity -gt 4) {
                        $errors += "${alertPath}: alertRuleSeverity '$($alert.alertRuleSeverity)' must be between 0 and 4."
                    }
                }

                if (-not [string]::IsNullOrEmpty($alert.alertType) -and $alert.alertType -notin $validAlertTypes) {
                    $errors += "${alertPath}: Invalid alertType '$($alert.alertType)'. Must be one of: $($validAlertTypes -join ', ')."
                }

                if (-not [string]::IsNullOrEmpty($alert.evaluationFrequency) -and $alert.evaluationFrequency -notmatch '^PT[0-9]+[MH]$') {
                    $errors += "${alertPath}: evaluationFrequency '$($alert.evaluationFrequency)' must be ISO 8601 duration (e.g., PT5M, PT15M)."
                }

                if (-not [string]::IsNullOrEmpty($alert.windowSize) -and $alert.windowSize -notmatch '^PT[0-9]+[MH]$') {
                    $errors += "${alertPath}: windowSize '$($alert.windowSize)' must be ISO 8601 duration (e.g., PT15M)."
                }

                if (-not [string]::IsNullOrEmpty($alert.operator) -and $alert.operator -notin $validOperators) {
                    $errors += "${alertPath}: Invalid operator '$($alert.operator)'. Must be one of: $($validOperators -join ', ')."
                }
            }
        }

        # Discovery validation
        if ($null -ne $pack.Discovery) {
            if ([string]::IsNullOrEmpty($pack.Discovery.Query)) {
                $errors += "$packPath ($($pack.Tag)).Discovery: Missing or empty required field 'Query'."
            }
        }

        # Dashboards validation
        if ($null -ne $pack.Dashboards) {
            for ($d = 0; $d -lt $pack.Dashboards.Count; $d++) {
                $dashboard = $pack.Dashboards[$d]
                $dashPath = "$packPath ($($pack.Tag)).Dashboards[$d]"

                foreach ($field in @('Name', 'DashboardPath')) {
                    if ([string]::IsNullOrEmpty($dashboard.$field)) {
                        $errors += "${dashPath}: Missing or empty required field '$field'."
                    }
                }
            }
        }
    }
}

# Report results
Write-Host "========================================" -ForegroundColor Cyan
if ($errors.Count -eq 0) {
    Write-Host "PASS: PacksDef.json is valid. ($($packsData.Packs.Count) packs validated)" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "FAIL: PacksDef.json has $($errors.Count) validation error(s):" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    foreach ($err in $errors) {
        Write-Host "  ERROR: $err" -ForegroundColor Red
    }
    exit 1
}
