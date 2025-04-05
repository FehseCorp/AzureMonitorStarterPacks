
param location string
param Tags object
param pepname string
param serviceId string
param subnetId string
param serviceName string

// resource pepnic 'Microsoft.Network/networkInterfaces@2023-05-01' = {
//   name: '${pepname}-nic'
//   location: location
//   properties: {
//     ipConfigurations: [
//       {
//         name: 'ipconfig1'
//         properties: {
//           privateIPAllocationMethod: 'Dynamic'
//           subnet: {
//             id: subnetId
//           }
//         }
//       }
//     ]
//   }
// }

resource privateendpoint 'Microsoft.Network/privateEndpoints@2023-05-01' = {
  name: pepname
  location: location
  tags: Tags
  properties: {
    privateLinkServiceConnections: [
      {
        name: serviceName
        properties: {
          privateLinkServiceId: serviceId
          requestMessage: 'Please approve my connection.'
        }
      }
    ]
    subnet: {
      id: subnetId
    }
  }
}
output pepid string = privateendpoint.id
