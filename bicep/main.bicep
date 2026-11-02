targetScope = 'resourceGroup'

@description('Project prefix used for resource names.')
param prefix string = 'agui'

@description('Azure region.')
param location string = resourceGroup().location

@description('Model to deploy.')
param modelName string = 'gpt-4o'

@description('Model version.')
param modelVersion string = '2024-11-20'

@description('Deployment SKU name.')
param modelSkuName string = 'GlobalStandard'

@description('Deployment capacity (thousands of tokens per minute).')
param modelCapacity int = 50

@description('Optional principal (user/service principal object id) granted access to call the project.')
param principalId string = ''

@allowed(['User', 'ServicePrincipal', 'Group'])
param principalType string = 'User'

var suffix = uniqueString(resourceGroup().id)
var accountName = '${prefix}-foundry-${suffix}'
var projectName = '${prefix}-project'

resource account 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: accountName
  location: location
  kind: 'AIServices'
  sku: { name: 'S0' }
  identity: { type: 'SystemAssigned' }
  properties: {
    customSubDomainName: accountName
    allowProjectManagement: true
    publicNetworkAccess: 'Enabled'
  }
}

resource project 'Microsoft.CognitiveServices/accounts/projects@2025-06-01' = {
  parent: account
  name: projectName
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    displayName: projectName
    description: 'agui chat project'
  }
}

resource deployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  parent: account
  name: modelName
  sku: {
    name: modelSkuName
    capacity: modelCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: modelName
      version: modelVersion
    }
  }
}

// Azure AI User role
var azureAIUserRoleId = '53ca6127-db72-4b80-b1b0-d745d6d5456d'

resource userAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(principalId)) {
  name: guid(account.id, principalId, azureAIUserRoleId)
  scope: account
  properties: {
    principalId: principalId
    principalType: principalType
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', azureAIUserRoleId)
  }
}

output accountName string = account.name
output projectName string = project.name
output projectEndpoint string = 'https://${account.name}.services.ai.azure.com/api/projects/${project.name}'
output modelDeployment string = deployment.name
