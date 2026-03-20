using namespace System.Net
param($Request, $TriggerMetadata)

Write-Host "prometheus: PowerShell HTTP trigger function processed a request."

# Required query parameters
$amwResourceId = $Request.Query.amwResourceId
$query = $Request.Query.query

if ([string]::IsNullOrEmpty($amwResourceId) -or [string]::IsNullOrEmpty($query)) {
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::BadRequest
        Body       = '{"error": "Missing required query parameters: amwResourceId, query"}'
    })
    return
}

# Validate amwResourceId looks like an ARM resource ID for an Azure Monitor Workspace
if ($amwResourceId -notmatch '^/subscriptions/[0-9a-f-]+/resourceGroups/[^/]+/providers/Microsoft\.Monitor/accounts/[^/]+$') {
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::BadRequest
        Body       = '{"error": "Invalid amwResourceId format"}'
    })
    return
}

try {
    # 1. Resolve the Prometheus query endpoint from the AMW resource via ARM
    $armToken = Get-AzAccessToken
    $bearerArm = if ($armToken.Token -is [securestring]) {
        [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($armToken.Token))
    } else { $armToken.Token }

    $armUrl = "https://management.azure.com${amwResourceId}?api-version=2023-04-03"
    $amwResponse = Invoke-RestMethod -Method Get -Uri $armUrl -Headers @{
        Authorization = "Bearer $bearerArm"
    }
    $prometheusEndpoint = $amwResponse.properties.metrics.prometheusQueryEndpoint
    if ([string]::IsNullOrEmpty($prometheusEndpoint)) {
        Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
            StatusCode = [HttpStatusCode]::InternalServerError
            Body       = '{"error": "Azure Monitor Workspace does not expose a Prometheus query endpoint"}'
        })
        return
    }
    Write-Host "prometheus: Resolved endpoint: $prometheusEndpoint"

    # 2. Get a Prometheus-scoped token via managed identity
    $promToken = Get-AzAccessToken -ResourceUrl 'https://prometheus.monitor.azure.com'
    $bearerProm = if ($promToken.Token -is [securestring]) {
        [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($promToken.Token))
    } else { $promToken.Token }

    # 3. Execute the PromQL query
    $encodedQuery = [System.Uri]::EscapeDataString($query)
    $promUrl = "${prometheusEndpoint}/api/v1/query?query=${encodedQuery}"
    Write-Host "prometheus: Querying $promUrl"

    $promResponse = Invoke-RestMethod -Method Get -Uri $promUrl -Headers @{
        Authorization = "Bearer $bearerProm"
    }

    $body = $promResponse | ConvertTo-Json -Depth 10

    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::OK
        Body       = $body
        Headers    = @{ 'Content-Type' = 'application/json' }
    })
}
catch {
    Write-Host "prometheus: Error: $_"
    $statusCode = [HttpStatusCode]::InternalServerError
    $errorMessage = $_.Exception.Message
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = $statusCode
        Body       = "{`"error`": `"$errorMessage`"}"
    })
}
