$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Install/start Docker Desktop with Linux containers first.' }
$dockerOS = docker info --format '{{.OSType}}'
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop is not running.' }
if ($dockerOS -ne 'linux') { throw 'Switch Docker Desktop to Linux containers.' }
if (-not (Test-Path '.env')) {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $key = [BitConverter]::ToString($bytes).Replace('-', '').ToLower()
    $envText = (Get-Content '.env.example' -Raw).Replace('N8N_ENCRYPTION_KEY=', "N8N_ENCRYPTION_KEY=$key")
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot '.env'), $envText)
    Write-Host 'Enter your Earthdata token in the local .env file. Save and close Notepad to continue.'
    Start-Process notepad.exe -ArgumentList (Join-Path $PSScriptRoot '.env') -Wait
}
New-Item -ItemType Directory -Force 'local-files' | Out-Null
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { throw 'Docker build/start failed. Review the message above.' }
$portLine = Get-Content '.env' | Where-Object { $_ -match '^N8N_LOCAL_PORT=' } | Select-Object -First 1
$port = if ($portLine) { ($portLine -split '=', 2)[1] } else { '5679' }
$workerLine = Get-Content '.env' | Where-Object { $_ -match '^WORKER_LOCAL_PORT=' } | Select-Object -First 1
$workerPort = if ($workerLine) { ($workerLine -split '=', 2)[1] } else { '8089' }
$workerUrl = "http://localhost:$workerPort"
$ready = $false
for ($attempt = 0; $attempt -lt 90; $attempt++) {
    try {
        $health = Invoke-RestMethod "$workerUrl/health" -TimeoutSec 3
        if ($health.ok) { $ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
}
if (-not $ready) { throw 'Worker did not become ready. Run: docker compose logs earthdata-worker' }
if (-not $health.credentials_configured) {
    throw 'Enter a valid Earthdata token or username/password in .env, then run this launcher again.'
}
$result = Invoke-RestMethod -Method Post "$workerUrl/run" -TimeoutSec 30
Write-Host "Collection state: $($result.status). Existing committed granules will be resumed."
Write-Host "Monitor progress at $workerUrl/status or in local-files/work/progress.json."
Write-Host 'Output: local-files/lupus_cortex_2025_actual.csv. It appears after actual observations are collected.'
Write-Host "n8n editor: http://localhost:$port . Create your owner account if this is the first launch."
Write-Host 'If the workflow is absent, import n8n/workflow.json using the editor menu.'
Start-Process "$workerUrl/status"
