import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";

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
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultConfig, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return defaultConfig;
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
