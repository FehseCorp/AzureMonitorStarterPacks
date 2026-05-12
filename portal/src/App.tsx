import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  Title2,
  Button,
  Spinner,
} from "@fluentui/react-components";
import { ThemeProvider, useTheme } from "./hooks/useTheme";
import {
  MsalProvider,
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
} from "@azure/msal-react";
import { PublicClientApplication, EventType, BrowserAuthError } from "@azure/msal-browser";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { loadRuntimeConfig, buildMsalConfig, managementScope } from "./auth/msalConfig";
import { AppShell } from "./components/Layout/AppShell";
import { GettingStartedPage } from "./pages/GettingStarted/GettingStartedPage";
import { MonitoredServers } from "./pages/Servers/MonitoredServers";
import { NonMonitoredServers } from "./pages/Servers/NonMonitoredServers";
import { MonitoredServices } from "./pages/Services/MonitoredServices";
import { NonMonitoredServices } from "./pages/Services/NonMonitoredServices";
import { ConfigurationPage } from "./pages/Configuration/ConfigurationPage";
import { LogsPage } from "./pages/Logs/LogsPage";
import { JobsPage } from "./pages/Jobs/JobsPage";
// Status sub-pages
import { ActiveAlerts } from "./pages/Status/ActiveAlerts";
import { IaaSSummary } from "./pages/Status/IaaSSummary";
import { ServicesSummary } from "./pages/Status/ServicesSummary";
import { Dashboards } from "./pages/Status/Dashboards";
import { MonitoringSummary } from "./pages/Status/MonitoringSummary";
// Alert Rules sub-pages
import { PackAlerts } from "./pages/AlertRules/PackAlerts";
import { OtherAlerts } from "./pages/AlertRules/OtherAlerts";
// Packs sub-pages
import { PackAssociations } from "./pages/Packs/PackAssociations";
import { DCRDetails } from "./pages/Packs/DCRDetails";
import { VMInsightsStatus } from "./pages/Packs/VMInsightsStatus";
import { ImportPack } from "./pages/Packs/ImportPack";
import { PackDetails } from "./pages/Packs/PackDetails";
// Agents sub-pages
import { AgentsList } from "./pages/Agents/AgentsList";
import { Heartbeat } from "./pages/Agents/Heartbeat";
import { OTelHeartbeat } from "./pages/Agents/OTelHeartbeat";
import { VMApplications } from "./pages/Agents/VMApplications";
// Discovery sub-pages
import { DiscoveryResults } from "./pages/Discovery/DiscoveryResults";
import { DiscoveryConfig } from "./pages/Discovery/DiscoveryConfig";
import { DiscoveryData } from "./pages/Discovery/DiscoveryData";
import { ConfigProvider } from "./hooks/useConfig";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

let msalInstance: PublicClientApplication | null = null;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

function LoginPage() {
  const handleLogin = () => {
    msalInstance!.loginRedirect(managementScope);
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: 16,
      }}
    >
      <Title2>Azure Monitor Starter Packs — Admin Portal</Title2>
      <Button appearance="primary" size="large" onClick={handleLogin}>
        Sign in with Microsoft
      </Button>
    </div>
  );
}

function AppInner() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { mode } = useTheme();
  const theme = mode === "dark" ? webDarkTheme : webLightTheme;

  useEffect(() => {
    loadRuntimeConfig().then((runtimeConfig) => {
      if (!runtimeConfig.clientId) {
        setInitError("No Azure Client ID configured. Set AZURE_CLIENT_ID on the App Service or VITE_AZURE_CLIENT_ID for local dev.");
        return;
      }
      msalInstance = new PublicClientApplication(buildMsalConfig(runtimeConfig));
      return msalInstance.initialize().then(() => {
        return msalInstance!.handleRedirectPromise();
      });
    }).then((response) => {
      if (!msalInstance) return;
      if (response?.account) {
        msalInstance.setActiveAccount(response.account);
      } else {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          msalInstance.setActiveAccount(accounts[0]);
        }
      }

      msalInstance.addEventCallback((event) => {
        if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
          const account = (event.payload as { account?: unknown }).account;
          if (account) {
            msalInstance!.setActiveAccount(account as Parameters<typeof msalInstance.setActiveAccount>[0]);
          }
        }
      });

      setIsReady(true);
    }).catch((err) => {
      // Stale interaction cache — clear it and reload so the app can recover
      if (err instanceof BrowserAuthError && err.errorCode === "no_token_request_cache_error") {
        sessionStorage.clear();
        window.location.reload();
        return;
      }
      console.error("MSAL init failed:", err);
      setInitError(String(err));
    });
  }, []);

  if (initError) {
    return (
      <FluentProvider theme={theme}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", gap: 16 }}>
          <Title2>MSAL Initialization Error</Title2>
          <p style={{ color: "red", maxWidth: 600, wordBreak: "break-all" }}>{initError}</p>
        </div>
      </FluentProvider>
    );
  }

  if (!isReady) {
    return (
      <FluentProvider theme={theme}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
          <Spinner size="large" label="Initializing..." />
        </div>
      </FluentProvider>
    );
  }
  return (
    <MsalProvider instance={msalInstance!}>
      <FluentProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <AuthenticatedTemplate>
            <ConfigProvider>
              <BrowserRouter>
                <AppShell>
                  <ErrorBoundary>
                  <Routes>
                  <Route path="/" element={<GettingStartedPage />} />

                  <Route path="/status" element={<Navigate to="/status/summary" replace />} />
                  <Route path="/status/summary" element={<MonitoringSummary />} />
                  <Route path="/status/alerts" element={<ActiveAlerts />} />
                  <Route path="/status/iaas" element={<IaaSSummary />} />
                  <Route path="/status/services" element={<ServicesSummary />} />
                  <Route path="/status/dashboards" element={<Dashboards />} />

                  <Route path="/servers" element={<Navigate to="/servers/monitored" replace />} />
                  <Route path="/servers/monitored" element={<MonitoredServers />} />
                  <Route path="/servers/non-monitored" element={<NonMonitoredServers />} />

                  <Route path="/services" element={<Navigate to="/services/monitored" replace />} />
                  <Route path="/services/monitored" element={<MonitoredServices />} />
                  <Route path="/services/non-monitored" element={<NonMonitoredServices />} />

                  <Route path="/alerts" element={<Navigate to="/alerts/pack" replace />} />
                  <Route path="/alerts/pack" element={<PackAlerts />} />
                  <Route path="/alerts/other" element={<OtherAlerts />} />

                  <Route path="/packs" element={<Navigate to="/packs/associations" replace />} />
                  <Route path="/packs/associations" element={<PackAssociations />} />
                  <Route path="/packs/dcr" element={<DCRDetails />} />
                  <Route path="/packs/vminsights" element={<VMInsightsStatus />} />
                  <Route path="/packs/import" element={<ImportPack />} />
                  <Route path="/packs/details" element={<PackDetails />} />

                  <Route path="/agents" element={<Navigate to="/agents/management" replace />} />
                  <Route path="/agents/management" element={<AgentsList />} />
                  <Route path="/agents/heartbeat" element={<Heartbeat />} />
                  <Route path="/agents/otel-heartbeat" element={<OTelHeartbeat />} />
                  <Route path="/agents/vmapps" element={<VMApplications />} />

                  <Route path="/discovery" element={<Navigate to="/discovery/results" replace />} />
                  <Route path="/discovery/results" element={<DiscoveryResults />} />
                  <Route path="/discovery/config" element={<DiscoveryConfig />} />
                  <Route path="/discovery/data" element={<DiscoveryData />} />

                  <Route path="/configuration" element={<ConfigurationPage />} />
                  <Route path="/logs" element={<LogsPage />} />
                  <Route path="/jobs" element={<JobsPage />} />
                  </Routes>
                  </ErrorBoundary>
                </AppShell>
              </BrowserRouter>
            </ConfigProvider>
          </AuthenticatedTemplate>
          <UnauthenticatedTemplate>
            <BrowserRouter>
              <LoginPage />
            </BrowserRouter>
          </UnauthenticatedTemplate>
        </QueryClientProvider>
      </FluentProvider>
    </MsalProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

export default App;

