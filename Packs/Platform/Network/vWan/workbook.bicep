param Tags object
param location string
param workspaceId string
param name string

var wbConfig=string(loadJsonContent('./workbook.json'))

resource workbook 'Microsoft.Insights/workbooks@2022-04-01' = {
  location: location
  tags: Tags
  kind: 'shared'
  name: guid(name)
  properties:{
    displayName: name
    serializedData: wbConfig
    category: 'workbook'
    sourceId: workspaceId
    
  }
}
