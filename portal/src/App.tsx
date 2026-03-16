import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import {
  FluentProvider,
  webLightTheme,
  Title2,
  Button,
  Spinner,
} from "@fluentui/react-components";
import {
  MsalProvider,
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
} from "@azure/msal-react";
import { PublicClientApplication, EventType, BrowserAuthError } from "@azure/msal-browser";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { msalConfig, managementScope } from "./auth/msalConfig";
import { AppShell } from "./components/Layout/AppShell";
import { GettingStartedPage } from "./pages/GettingStarted/GettingStartedPage";
import { StatusPage } from "./pages/Status/StatusPage";
import { ServersPage } from "./pages/Servers/ServersPage";
import { ServicesPage } from "./pages/Services/ServicesPage";
import { AlertRulesPage } from "./pages/AlertRules/AlertRulesPage";
import { PacksPage } from "./pages/Packs/PacksPage";
import { AgentsPage } from "./pages/Agents/AgentsPage";
import { DiscoveryPage } from "./pages/Discovery/DiscoveryPage";
import { ConfigurationPage } from "./pages/Configuration/ConfigurationPage";
import { LogsPage } from "./pages/Logs/LogsPage";
import { ConfigProvider } from "./hooks/useConfig";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

const msalInstance = new PublicClientApplication(msalConfig);
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
    msalInstance.loginRedirect(managementScope);
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

function App() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    msalInstance.initialize().then(() => {
      // Handle redirect response after login
      return msalInstance.handleRedirectPromise();
    }).then((response) => {
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
            msalInstance.setActiveAccount(account as Parameters<typeof msalInstance.setActiveAccount>[0]);
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
      <FluentProvider theme={webLightTheme}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", gap: 16 }}>
          <Title2>MSAL Initialization Error</Title2>
          <p style={{ color: "red", maxWidth: 600, wordBreak: "break-all" }}>{initError}</p>
        </div>
      </FluentProvider>
    );
  }

  if (!isReady) {
    return (
      <FluentProvider theme={webLightTheme}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
          <Spinner size="large" label="Initializing..." />
        </div>
      </FluentProvider>
    );
  }
  return (
    <MsalProvider instance={msalInstance}>
      <FluentProvider theme={webLightTheme}>
        <QueryClientProvider client={queryClient}>
          <AuthenticatedTemplate>
            <ConfigProvider>
              <BrowserRouter>
                <AppShell>
                  <ErrorBoundary>
                  <Routes>
                  <Route path="/" element={<GettingStartedPage />} />
                  <Route path="/status" element={<StatusPage />} />
                  <Route path="/servers" element={<ServersPage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/alerts" element={<AlertRulesPage />} />
                  <Route path="/packs" element={<PacksPage />} />
                  <Route path="/agents" element={<AgentsPage />} />
                  <Route path="/discovery" element={<DiscoveryPage />} />
                  <Route path="/configuration" element={<ConfigurationPage />} />
                  <Route path="/logs" element={<LogsPage />} />
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

export default App;

