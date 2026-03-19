import { useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  Button,
  Text,
  tokens,
  makeStyles,
  Badge,
  Divider,
} from "@fluentui/react-components";
import {
  BugRegular,
  DismissRegular,
  ArrowSyncRegular,
} from "@fluentui/react-icons";
import { useMsal } from "@azure/msal-react";
import { useConfig } from "../hooks/useConfig";
import { getRuntimeConfig, managementScope } from "../auth/msalConfig";
import { callFunction } from "../services/functionClient";

const useStyles = makeStyles({
  fab: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: 10000,
  },
  overlay: {
    position: "fixed",
    bottom: "70px",
    right: "20px",
    width: "520px",
    maxHeight: "80vh",
    overflowY: "auto",
    zIndex: 10000,
    boxShadow: tokens.shadow16,
  },
  section: {
    marginBottom: tokens.spacingVerticalS,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: `${tokens.spacingVerticalXXS} 0`,
    gap: tokens.spacingHorizontalS,
  },
  label: {
    fontWeight: 600,
    minWidth: "140px",
    flexShrink: 0,
    fontSize: "12px",
  },
  value: {
    wordBreak: "break-all",
    fontSize: "12px",
    fontFamily: "monospace",
  },
  stepBox: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalXS,
    marginBottom: tokens.spacingVerticalXS,
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
    fontFamily: "monospace",
    fontSize: "12px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
  successText: {
    color: tokens.colorPaletteGreenForeground1,
    fontFamily: "monospace",
    fontSize: "12px",
  },
});

type StepStatus = "idle" | "running" | "ok" | "fail";

interface StepResult {
  status: StepStatus;
  detail: string;
}

function StatusBadge({ status }: { status: StepStatus }) {
  switch (status) {
    case "idle":
      return <Badge appearance="outline" color="informative">pending</Badge>;
    case "running":
      return <Badge appearance="filled" color="informative">running...</Badge>;
    case "ok":
      return <Badge appearance="filled" color="success">OK</Badge>;
    case "fail":
      return <Badge appearance="filled" color="danger">FAIL</Badge>;
  }
}

export function DiagnosticsPanel() {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const { config, isConfigured } = useConfig();

  const [steps, setSteps] = useState<Record<string, StepResult>>({});

  const setStep = (name: string, result: StepResult) => {
    setSteps((prev) => ({ ...prev, [name]: result }));
  };

  const runDiagnostics = useCallback(async () => {
    setRunning(true);
    setSteps({});

    // --- Step 1: Runtime Config ---
    setStep("runtimeConfig", { status: "running", detail: "" });
    let rt: ReturnType<typeof getRuntimeConfig> | null = null;
    try {
      rt = getRuntimeConfig();
      const fields = Object.entries(rt)
        .map(([k, v]) => `${k}: ${v ? String(v).substring(0, 80) : "(empty)"}`)
        .join("\n");
      setStep("runtimeConfig", { status: "ok", detail: fields });
    } catch (err) {
      setStep("runtimeConfig", {
        status: "fail",
        detail: `getRuntimeConfig() threw: ${err}`,
      });
      setRunning(false);
      return;
    }

    // --- Step 1b: Fetch /config.json directly ---
    setStep("configJson", { status: "running", detail: "" });
    try {
      const res = await fetch("/config.json");
      const text = await res.text();
      setStep("configJson", {
        status: res.ok ? "ok" : "fail",
        detail: `HTTP ${res.status}\n${text.substring(0, 500)}`,
      });
    } catch (err) {
      setStep("configJson", { status: "fail", detail: `fetch() threw: ${err}` });
    }

    // --- Step 2: AppConfig from useConfig ---
    setStep("appConfig", { status: "running", detail: "" });
    const configFields = Object.entries(config)
      .map(([k, v]) => `${k}: ${v ? String(v).substring(0, 80) : "(empty)"}`)
      .join("\n");
    const missingCritical = [];
    if (!config.functionAppUrl) missingCritical.push("functionAppUrl");
    if (!config.functionAppId) missingCritical.push("functionAppId");
    if (!config.instanceName) missingCritical.push("instanceName");
    if (!config.workspaceId) missingCritical.push("workspaceId");
    setStep("appConfig", {
      status: missingCritical.length > 0 ? "fail" : "ok",
      detail: missingCritical.length > 0
        ? `MISSING: ${missingCritical.join(", ")}\n\n${configFields}`
        : configFields,
    });

    // --- Step 3: MSAL Auth ---
    setStep("msalAuth", { status: "running", detail: "" });
    if (!account) {
      setStep("msalAuth", {
        status: "fail",
        detail: "No MSAL account — user not signed in",
      });
      setRunning(false);
      return;
    }

    let accessToken = "";
    try {
      const tokenResponse = await instance.acquireTokenSilent({
        ...managementScope,
        account,
      });
      accessToken = tokenResponse.accessToken;
      const decoded = parseJwtPayload(accessToken);
      setStep("msalAuth", {
        status: "ok",
        detail: `Token acquired (${accessToken.length} chars)\naud: ${decoded?.aud}\nexp: ${decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : "?"}\noid: ${decoded?.oid}\nscp/roles: ${decoded?.scp || decoded?.roles || "(none)"}`,
      });
    } catch (err) {
      setStep("msalAuth", {
        status: "fail",
        detail: `acquireTokenSilent failed: ${err}`,
      });
      setRunning(false);
      return;
    }

    // --- Step 4: Call Function App (test endpoint) ---
    setStep("callFunction", { status: "running", detail: "" });
    if (!config.functionAppUrl) {
      setStep("callFunction", {
        status: "fail",
        detail: `functionAppUrl is empty`,
      });
    } else {
      try {
        const result = await callFunction(
          config.functionAppUrl,
          accessToken,
          "config",
          undefined,
          { Action: "getavailableIaaSPacks" },
        );
        const resultStr = typeof result === "string" ? result : JSON.stringify(result, null, 2);
        setStep("callFunction", {
          status: "ok",
          detail: `Response:\n${resultStr.substring(0, 500)}`,
        });
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        setStep("callFunction", {
          status: "fail",
          detail: `callFunction() failed:\n${detail}`,
        });
      }
    }

    // --- Step 4b: Raw fetch to function app (bypass callFunction) ---
    setStep("rawFetch", { status: "running", detail: "" });
    if (config.functionAppUrl) {
      const testUrl = `${config.functionAppUrl}/api/config?Action=getavailableIaaSPacks`;
      try {
        const res = await fetch(testUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        const text = await res.text();
        setStep("rawFetch", {
          status: res.ok ? "ok" : "fail",
          detail: `URL: ${testUrl}\nHTTP ${res.status} ${res.statusText}\nCORS headers: access-control-allow-origin=${res.headers.get("access-control-allow-origin") || "(not present)"}\nBody:\n${text.substring(0, 400)}`,
        });
      } catch (err) {
        setStep("rawFetch", {
          status: "fail",
          detail: `URL: ${testUrl}\nfetch() threw: ${err}\n\nThis usually means CORS is blocking the request. Check the Function App CORS settings.`,
        });
      }
    } else {
      setStep("rawFetch", { status: "fail", detail: "No functionAppUrl" });
    }

    // --- Step 5: CORS preflight test ---
    setStep("corsPreflight", { status: "running", detail: "" });
    if (config.functionAppUrl) {
      try {
        const preflightUrl = `${config.functionAppUrl}/api/config`;
        const res = await fetch(preflightUrl, {
          method: "OPTIONS",
          headers: {
            Origin: window.location.origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
          },
        });
        const hdrs = [
          "access-control-allow-origin",
          "access-control-allow-methods",
          "access-control-allow-headers",
          "access-control-allow-credentials",
        ]
          .map((h) => `${h}: ${res.headers.get(h) || "(not present)"}`)
          .join("\n");
        setStep("corsPreflight", {
          status: res.ok || res.status === 204 ? "ok" : "fail",
          detail: `OPTIONS ${preflightUrl}\nHTTP ${res.status}\nOrigin sent: ${window.location.origin}\n${hdrs}`,
        });
      } catch (err) {
        setStep("corsPreflight", {
          status: "fail",
          detail: `OPTIONS preflight threw: ${err}\nOrigin: ${window.location.origin}\n\nCORS is blocking. The Function App needs to allow: ${window.location.origin}`,
        });
      }
    } else {
      setStep("corsPreflight", { status: "fail", detail: "No functionAppUrl" });
    }

    setRunning(false);
  }, [account, config, instance]);

  if (!open) {
    return (
      <Button
        className={styles.fab}
        appearance="primary"
        icon={<BugRegular />}
        onClick={() => setOpen(true)}
        shape="circular"
        size="large"
        title="Open diagnostics"
      />
    );
  }

  const stepOrder: { key: string; label: string }[] = [
    { key: "runtimeConfig", label: "1. Runtime Config (getRuntimeConfig)" },
    { key: "configJson", label: "2. Fetch /config.json" },
    { key: "appConfig", label: "3. AppConfig (useConfig)" },
    { key: "msalAuth", label: "4. MSAL Token Acquisition" },
    { key: "callFunction", label: "5. callFunction() — API call" },
    { key: "rawFetch", label: "6. Raw fetch() — bypass wrapper" },
    { key: "corsPreflight", label: "7. CORS preflight (OPTIONS)" },
  ];

  return (
    <>
      <Card className={styles.overlay}>
        <CardHeader
          header={<Text weight="bold">Diagnostics Panel</Text>}
          action={
            <Button
              appearance="subtle"
              icon={<DismissRegular />}
              onClick={() => setOpen(false)}
              size="small"
            />
          }
        />
        <div style={{ padding: "0 16px 16px 16px" }}>
          <div className={styles.row}>
            <Text className={styles.label}>Portal origin:</Text>
            <Text className={styles.value}>{window.location.origin}</Text>
          </div>
          <div className={styles.row}>
            <Text className={styles.label}>Signed in as:</Text>
            <Text className={styles.value}>
              {account ? `${account.name} (${account.username})` : "Not signed in"}
            </Text>
          </div>
          <div className={styles.row}>
            <Text className={styles.label}>isConfigured:</Text>
            <Text className={styles.value}>{String(isConfigured)}</Text>
          </div>
          <Divider style={{ margin: "8px 0" }} />

          <Button
            appearance="primary"
            icon={<ArrowSyncRegular />}
            onClick={runDiagnostics}
            disabled={running}
            size="small"
            style={{ marginBottom: 12 }}
          >
            {running ? "Running..." : "Run Diagnostics"}
          </Button>

          {stepOrder.map(({ key, label }) => {
            const step = steps[key];
            if (!step) return null;
            return (
              <div key={key} className={styles.stepBox}>
                <div className={styles.row}>
                  <Text className={styles.label}>{label}</Text>
                  <StatusBadge status={step.status} />
                </div>
                {step.detail && (
                  <Text
                    className={
                      step.status === "fail" ? styles.errorText : styles.successText
                    }
                    block
                  >
                    {step.detail}
                  </Text>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      <Button
        className={styles.fab}
        appearance="primary"
        icon={<BugRegular />}
        onClick={() => setOpen(false)}
        shape="circular"
        size="large"
        title="Close diagnostics"
      />
    </>
  );
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
