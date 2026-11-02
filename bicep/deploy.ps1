param(
    [string]$ResourceGroup = 'rg-agui-history',
    [string]$Location = 'eastus2',
    [switch]$SkipPublish
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$principalId = az ad signed-in-user show --query id -o tsv
if (-not $principalId) { throw 'Not logged in. Run: az login' }

az group create -n $ResourceGroup -l $Location -o none

$outputs = az deployment group create `
    -g $ResourceGroup `
    -n "agui-$(Get-Date -Format yyyyMMddHHmmss)" `
    -f main.bicep `
    -p main.bicepparam `
    -p principalId=$principalId `
    --query properties.outputs -o json | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) { throw 'Deployment failed.' }

Write-Host "Project endpoint: $($outputs.projectEndpoint.value)"
Write-Host "Model deployment: $($outputs.modelDeployment.value)"
Write-Host "API app:          $($outputs.apiAppName.value) ($($outputs.apiUrl.value))"
Write-Host "Web app:          $($outputs.webAppName.value) ($($outputs.webUrl.value))"

if ($SkipPublish) { return }

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$build = Join-Path $root '.deploy'
Remove-Item $build -Recurse -Force -ErrorAction SilentlyContinue
New-Item $build -ItemType Directory | Out-Null

# API: publish and zip deploy.
$apiOut = Join-Path $build 'api'
dotnet publish (Join-Path $root 'src/api/Api.csproj') -c Release -o $apiOut
if ($LASTEXITCODE -ne 0) { throw 'dotnet publish failed.' }
$apiZip = Join-Path $build 'api.zip'
Compress-Archive -Path "$apiOut/*" -DestinationPath $apiZip
az webapp deploy -g $ResourceGroup -n $outputs.apiAppName.value --src-path $apiZip --type zip
if ($LASTEXITCODE -ne 0) { throw 'API deploy failed.' }

# Web app: the API URL is baked in at build time.
$appDir = Join-Path $root 'src/app'
Push-Location $appDir
try {
    if (-not (Test-Path node_modules)) {
        npm ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
    }
    $env:VITE_API_URL = $outputs.apiUrl.value
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'npm run build failed.' }
}
finally { Pop-Location; Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue }
$webZip = Join-Path $build 'web.zip'
Compress-Archive -Path (Join-Path $appDir 'dist/*') -DestinationPath $webZip
az webapp deploy -g $ResourceGroup -n $outputs.webAppName.value --src-path $webZip --type zip
if ($LASTEXITCODE -ne 0) { throw 'Web deploy failed.' }

Remove-Item $build -Recurse -Force
Write-Host "Done. Open $($outputs.webUrl.value)"
