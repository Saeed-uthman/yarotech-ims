param(
    [string]$ApiHealthUrl = "http://127.0.0.1:8000/health/",
    [string]$ApplicationUrl = "http://localhost:3000",
    [int]$TimeoutSeconds = 60
)

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$apiReady = $false
$applicationReady = $false

while ((Get-Date) -lt $deadline) {
    try {
        $apiResponse = Invoke-WebRequest -Uri $ApiHealthUrl -UseBasicParsing -TimeoutSec 2
        $apiReady = $apiResponse.StatusCode -ge 200 -and $apiResponse.StatusCode -lt 300
    }
    catch {
        $apiReady = $false
    }

    try {
        $applicationResponse = Invoke-WebRequest -Uri $ApplicationUrl -UseBasicParsing -TimeoutSec 2
        $applicationReady = $applicationResponse.StatusCode -ge 200 -and $applicationResponse.StatusCode -lt 400
    }
    catch {
        $applicationReady = $false
    }

    if ($apiReady -and $applicationReady) {
        Start-Process $ApplicationUrl
        Write-Host "Al-Amaan Pharmacy is ready."
        exit 0
    }

    Start-Sleep -Seconds 1
}

Write-Error "The system did not become ready in $TimeoutSeconds seconds. API ready: $apiReady; frontend ready: $applicationReady. Open the minimized server windows to inspect the error."
exit 1
