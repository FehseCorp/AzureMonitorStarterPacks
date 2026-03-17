import { LogLevel, type Configuration } from "@azure/msal-browser";

/**
 * Runtime configuration loaded from /config.json (generated at App Service startup)
 * or falling back to Vite build-time env vars for local development.
 */
export interface RuntimeConfig {
  clientId: string;
  tenantId: string;
  instanceName?: string;
  functionAppUrl?: string;
  functionAppResourceId?: string;
  functionAppName?: string;
  workspaceId?: string;
  workspaceName?: string;
  appInsightsId?: string;
  appInsightsName?: string;
  azureMonitorWorkspaceId?: string;
  azureMonitorWorkspaceName?: string;
}

let _runtimeConfig: RuntimeConfig | null = null;

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (_runtimeConfig) return _runtimeConfig;

  try {
    const res = await fetch("/config.json");
    if (res.ok) {
      const json = await res.json();
      if (json.clientId && json.clientId !== "%s") {
        _runtimeConfig = json;
        return _runtimeConfig;
      }
    }
  } catch {
    // config.json not available — fall through to env vars
  }

  // Fallback: Vite build-time env vars (local development)
  _runtimeConfig = {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "",
    tenantId: import.meta.env.VITE_AZURE_TENANT_ID || "common",
  };
  return _runtimeConfig;
}

export function getRuntimeConfig(): RuntimeConfig {
  if (!_runtimeConfig) throw new Error("Runtime config not loaded — call loadRuntimeConfig() first");
  return _runtimeConfig;
}

export function buildMsalConfig(config: RuntimeConfig): Configuration {
  return {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId || "common"}`,
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
    },
    cache: {
      cacheLocation: "localStorage" as const,
      storeAuthStateInCookie: false,
    },
    system: {
      loggerOptions: {
        logLevel: LogLevel.Warning,
        loggerCallback: (level, message, containsPii) => {
          if (containsPii) return;
          switch (level) {
            case LogLevel.Error:
              console.error(message);
              break;
            case LogLevel.Warning:
              console.warn(message);
              break;
          }
        },
      },
    },
  };
}

// Scopes for Azure Resource Management (ARM + ARG)
export const managementScope = {
  scopes: ["https://management.azure.com/.default"],
};

// Scopes for Log Analytics / App Insights
export const logAnalyticsScope = {
  scopes: ["https://api.loganalytics.io/.default"],
};
