param(
    [string]$ResourceGroup = 'rg-agui-history',
    [string]$Location = 'eastus2'
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
