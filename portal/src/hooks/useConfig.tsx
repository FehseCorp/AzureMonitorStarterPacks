import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { getRuntimeConfig } from "../auth/msalConfig";

export interface AppConfig {
  instanceName: string;
  functionAppId: string;
  functionAppName: string;
  functionAppUrl: string;
  workspaceId: string;
  workspaceName: string;
  actionGroupId: string;
  actionGroupName: string;
  azureMonitorWorkspaceId: string;
  azureMonitorWorkspaceName: string;
  grafanaId: string;
  grafanaEndpoint: string;
  appInsightsId: string;
  appInsightsName: string;
}

const STORAGE_KEY = "amp-portal-config";

const defaultConfig: AppConfig = {
  instanceName: "",
  functionAppId: "",
  functionAppName: "",
  functionAppUrl: "",
  workspaceId: "",
  workspaceName: "",
  actionGroupId: "",
  actionGroupName: "",
  azureMonitorWorkspaceId: "",
  azureMonitorWorkspaceName: "",
  grafanaId: "",
  grafanaEndpoint: "",
  appInsightsId: "",
  appInsightsName: "",
};

function loadConfig(): AppConfig {
  const seeded = { ...defaultConfig };

  // Seed from runtime config (deployment-injected values)
  try {
    const rt = getRuntimeConfig();
    if (rt.instanceName) seeded.instanceName = rt.instanceName;
    if (rt.functionAppUrl) seeded.functionAppUrl = rt.functionAppUrl;
    if (rt.functionAppResourceId) seeded.functionAppId = rt.functionAppResourceId;
    if (rt.functionAppName) seeded.functionAppName = rt.functionAppName;
    if (rt.workspaceId) seeded.workspaceId = rt.workspaceId;
    if (rt.workspaceName) seeded.workspaceName = rt.workspaceName;
    if (rt.appInsightsId) seeded.appInsightsId = rt.appInsightsId;
    if (rt.appInsightsName) seeded.appInsightsName = rt.appInsightsName;
    if (rt.azureMonitorWorkspaceId) seeded.azureMonitorWorkspaceId = rt.azureMonitorWorkspaceId;
    if (rt.azureMonitorWorkspaceName) seeded.azureMonitorWorkspaceName = rt.azureMonitorWorkspaceName;
  } catch {
    // runtime config not yet loaded
  }

  // Overlay user-stored overrides from localStorage, but ONLY for
  // fields that are user-selectable (not deployment-injected).
  // Deployment-injected fields from runtime config always win.
  const userOverridableKeys: Set<keyof AppConfig> = new Set([
    "actionGroupId",
    "actionGroupName",
    "grafanaId",
    "grafanaEndpoint",
  ]);
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AppConfig>;
      for (const key of Object.keys(parsed) as (keyof AppConfig)[]) {
        if (parsed[key] && userOverridableKeys.has(key)) {
          seeded[key] = parsed[key]!;
        }
      }
    }
  } catch {
    // ignore parse errors
  }

  return seeded;
}

interface ConfigContextValue {
  config: AppConfig;
  updateConfig: (partial: Partial<AppConfig>) => void;
  resetConfig: () => void;
  isConfigured: boolean;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(loadConfig);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const updateConfig = useCallback((partial: Partial<AppConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const isConfigured = !!(config.instanceName && config.functionAppUrl && config.workspaceId);

  return (
    <ConfigContext.Provider value={{ config, updateConfig, resetConfig, isConfigured }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}
