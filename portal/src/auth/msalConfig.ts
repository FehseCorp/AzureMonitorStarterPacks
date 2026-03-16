import { LogLevel } from "@azure/msal-browser";

// Replace with your Entra ID app registration client ID
const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID || "<your-client-id>";
const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID || "common";

export const msalConfig = {
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
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

// Scopes for Azure Resource Management (ARM + ARG)
export const managementScope = {
  scopes: ["https://management.azure.com/.default"],
};

// Scopes for Log Analytics / App Insights
export const logAnalyticsScope = {
  scopes: ["https://api.loganalytics.io/.default"],
};
