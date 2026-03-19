# Azure Monitoring Packs

Monitoring Starter Packs (MonStar Packs) - Revamp Test Branch

## Setup

The Main solution can be deployed by clicking the link below to the respective cloud.

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#blade/Microsoft_Azure_CreateUIDef/CustomDeploymentBlade/uri/https%3A%2F%2Fraw.githubusercontent.com%2FFehseCorp%2FAzureMonitorStarterPacks%2Frefs%2Fheads%2Fportal-security%2Fsetup%2Fmonstar.json/uiFormDefinitionUri/https%3A%2F%2Fraw.githubusercontent.com%2FFehseCorp%2FAzureMonitorStarterPacks%2Frefs%2Fheads%2Fportal-security%2Fsetup%2Fsetup.json)

### Portal Deployment

To deploy the Admin Portal alongside the solution, set these parameters:

| Parameter | Value |
|-----------|-------|
| `deployPortal` | `true` |
| `portalPackageUrl` | URL to `portal.zip` |

**For testing** from a branch, use the raw GitHub URL:

```
https://raw.githubusercontent.com/FehseCorp/AzureMonitorStarterPacks/refs/heads/<branch>/setup/backend/portal.zip
```

**For production** releases, use the GitHub Release asset URL:

```
https://github.com/Azure/AzureMonitorStarterPacks/releases/download/v<version>/portal.zip
```

