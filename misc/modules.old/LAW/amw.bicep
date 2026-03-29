param azureMonitorWorkspaceName string
param location string
param Tags object

resource amw 'Microsoft.Monitor/accounts@2023-04-03' = {
  name: azureMonitorWorkspaceName
  location: location
  tags: Tags
}

output amwResourceId string = amw.id
