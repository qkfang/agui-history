using './main.bicep'

param prefix = 'agui'
param modelName = 'gpt-5.4'
param modelVersion = '2026-03-05'
param modelSkuName = 'GlobalStandard'
param modelCapacity = 50
param principalType = 'User'
// principalId is supplied by deploy.ps1 (signed-in user)
