#!/bin/bash
# Generate config.json from App Service environment variables before starting the SPA.
# This runs on every container start, so config.json is always up-to-date even after
# a zip deployment that replaces wwwroot contents.
node -e "
const fs = require('fs');
fs.writeFileSync('/home/site/wwwroot/config.json', JSON.stringify({
  clientId: process.env.AZURE_CLIENT_ID || '',
  tenantId: process.env.AZURE_TENANT_ID || '',
  instanceName: process.env.INSTANCE_NAME || '',
  functionAppUrl: process.env.FUNCTION_APP_URL || '',
  functionAppResourceId: process.env.FUNCTION_APP_RESOURCE_ID || '',
  functionAppName: process.env.FUNCTION_APP_NAME || '',
  workspaceId: process.env.LAW_RESOURCE_ID || '',
  workspaceName: process.env.LAW_NAME || '',
  appInsightsId: process.env.APP_INSIGHTS_ID || '',
  appInsightsName: process.env.APP_INSIGHTS_NAME || '',
  azureMonitorWorkspaceId: process.env.AMW_ID || '',
  azureMonitorWorkspaceName: process.env.AMW_NAME || ''
}));
console.log('config.json generated from environment variables');
"
pm2 serve /home/site/wwwroot --no-daemon --spa
