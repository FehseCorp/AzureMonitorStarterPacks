import { useMemo } from "react";
import {
  Card,
  Text,
  Title2,
  Title3,
  Spinner,
  Badge,
  Link,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  CheckmarkCircleRegular,
  WarningRegular,
  DismissCircleRegular,
  InfoRegular,
} from "@fluentui/react-icons";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { ScoreGauge } from "../../components/common/ScoreGauge";
import { useARGQuery } from "../../hooks/useARGQuery";
import { useConfig } from "../../hooks/useConfig";
import {
  argTotalServers,
  argAMAInstalledServers,
  argNoDCRServers,
  argNoVMInsightsDCRServers,
  argMonitoredServersCount,
} from "../../services/queries/argQueries";
import { managementScope } from "../../auth/msalConfig";
import { callFunction } from "../../services/functionClient";

interface PaaSRow { Resource: string; AlertCount: number; [k: string]: unknown; }

// ── Styles ────────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  sections: {
    display: "flex",
    gap: tokens.spacingHorizontalL,
    flexWrap: "wrap",
  },
  section: {
    flex: "1 1 340px",
    minWidth: "300px",
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  metricRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    cursor: "pointer",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  metricLabel: {
    flex: 1,
  },
  scoreDetails: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalS,
    justifyContent: "center",
    marginTop: tokens.spacingVerticalS,
  },
  deductionChip: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: `2px ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase200,
    backgroundColor: tokens.colorNeutralBackground3,
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const extract = (data: unknown): number => {
  const rows = data as Record<string, unknown>[] | undefined;
  if (!rows || rows.length === 0) return 0;
  return Number(rows[0]["Total"] ?? 0);
};

interface MetricRowProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  loading: boolean;
  to: string;
  description?: string;
  positive?: boolean; // when true, a higher count is better (success), 0 is danger
}

function MetricRow({ icon, label, count, loading, to, description, positive }: MetricRowProps) {
  const styles = useStyles();
  const navigate = useNavigate();

  const badgeColor = positive
    ? (count > 0 ? "success" : "danger")
    : (count === 0 ? "success" : "warning");

  return (
    <div className={styles.metricRow} onClick={() => navigate(to)} title={description}>
      <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>
      <Text className={styles.metricLabel}>{label}</Text>
      {loading ? (
        <Spinner size="tiny" />
      ) : (
        <Badge appearance="filled" color={badgeColor}>
          {count}
        </Badge>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MonitoringSummary() {
  const styles = useStyles();
  const { config } = useConfig();
  const instance = config.instanceName;
  const { instance: msalInstance, accounts } = useMsal();
  const account = accounts[0];

  const enabled = !!instance;
  const opts = { enabled };

  const totalServersQ      = useARGQuery(["sumTotalServers",    instance], argTotalServers(instance ?? ""),            opts);
  const amaInstalledQ      = useARGQuery(["sumAMAInstalled",    instance], argAMAInstalledServers(instance ?? ""),    opts);
  const noDCRQ             = useARGQuery(["sumNoDCR",           instance], argNoDCRServers(instance ?? ""),           opts);
  const noVMIQ             = useARGQuery(["sumNoVMI",           instance], argNoVMInsightsDCRServers(instance ?? ""), opts);
  const monitoredServersQ  = useARGQuery(["sumMonitoredSvr",    instance], argMonitoredServersCount(instance ?? ""),  opts);

  const allPaaSQ = useQuery<PaaSRow[]>({
    queryKey: ["sumAllPaaS", config.functionAppUrl],
    queryFn: async () => {
      if (!account || !config.functionAppUrl) return [];
      const tokenResponse = await msalInstance.acquireTokenSilent({
        ...managementScope,
        account,
      });
      const result = await callFunction(
        config.functionAppUrl,
        tokenResponse.accessToken,
        "config",
        undefined,
        { Action: "getAllPaaS" },
      );
      let parsed = result;
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch { /* not JSON */ }
      }
      if (Array.isArray(parsed)) return parsed as PaaSRow[];
      if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (Array.isArray(val)) return val as PaaSRow[];
        }
      }
      return [];
    },
    enabled: !!account && !!config.functionAppUrl,
    staleTime: 60_000,
  });

  const isLoading = totalServersQ.isLoading || amaInstalledQ.isLoading || noDCRQ.isLoading
    || noVMIQ.isLoading || monitoredServersQ.isLoading || allPaaSQ.isLoading;

  const totalServers     = extract(totalServersQ.data);
  const amaInstalled     = extract(amaInstalledQ.data);
  const noAMA            = Math.max(0, totalServers - amaInstalled);
  const noDCR            = extract(noDCRQ.data);
  const noVMI            = extract(noVMIQ.data);
  const monitoredServers = extract(monitoredServersQ.data);

  const paaSRows        = allPaaSQ.data ?? [];
  const totalServices   = paaSRows.length;
  const noAlerts        = paaSRows.filter(r => (r.AlertCount ?? 0) === 0).length;
  const monitoredServices = Math.max(0, totalServices - noAlerts);

  // ── Score ──────────────────────────────────────────────────────────────────
  const score = useMemo(() => {
    if (isLoading) return 0;
    let s = 100;
    if (totalServers > 0) {
      s -= 25 * (noAMA  / totalServers);
      s -= 25 * (noDCR  / totalServers);
      s -= 10 * (noVMI  / totalServers);
    }
    if (totalServices > 0) {
      s -= 40 * (noAlerts / totalServices);
    }
    return Math.round(Math.max(0, Math.min(100, s)));
  }, [isLoading, totalServers, noAMA, noDCR, noVMI, totalServices, noAlerts]);

  if (!instance) {
    return <Text>Please select an instance in the Configuration tab first.</Text>;
  }

  const green  = <CheckmarkCircleRegular style={{ color: tokens.colorPaletteGreenForeground1 }} />;
  const warn   = <WarningRegular         style={{ color: tokens.colorPaletteYellowForeground1 }} />;
  const danger = <DismissCircleRegular   style={{ color: tokens.colorPaletteRedForeground1 }} />;

  return (
    <div className={styles.container}>
      {/* Score header */}
      <div className={styles.header}>
        <Title2>Monitoring Health Score</Title2>
        {isLoading ? (
          <Spinner size="large" label="Calculating score..." />
        ) : (
          <>
            <ScoreGauge score={score} />
            <div className={styles.scoreDetails}>
              {noAMA > 0 && (
                <span className={styles.deductionChip}>
                  <WarningRegular fontSize={12} />
                  {noAMA} server{noAMA !== 1 ? "s" : ""} without AMA agent
                </span>
              )}
              {noDCR > 0 && (
                <span className={styles.deductionChip}>
                  <WarningRegular fontSize={12} />
                  {noDCR} server{noDCR !== 1 ? "s" : ""} without DCR
                </span>
              )}
              {noVMI > 0 && (
                <span className={styles.deductionChip}>
                  <InfoRegular fontSize={12} />
                  {noVMI} server{noVMI !== 1 ? "s" : ""} without VMInsights
                </span>
              )}
              {noAlerts > 0 && (
                <span className={styles.deductionChip}>
                  <WarningRegular fontSize={12} />
                  {noAlerts} service{noAlerts !== 1 ? "s" : ""} without alerts
                </span>
              )}

              {score === 100 && (
                <span className={styles.deductionChip}>
                  <CheckmarkCircleRegular fontSize={12} />
                  All checks passed
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div className={styles.sections}>
        {/* Servers section */}
        <Card className={styles.section}>
          <Title3>Servers</Title3>

          <MetricRow
            icon={monitoredServers === totalServers && totalServers > 0 ? green : monitoredServers > 0 ? warn : danger}
            label="Monitored Servers"
            count={monitoredServers}
            loading={monitoredServersQ.isLoading}
            to="/servers/monitored"
            positive
            description="Servers with a VMInsights or OTel DCR association"
          />
          <MetricRow
            icon={amaInstalled === totalServers && totalServers > 0 ? green : amaInstalled > 0 ? warn : danger}
            label="AMA Agent Installed"
            count={amaInstalledQ.isLoading ? 0 : amaInstalled}
            loading={amaInstalledQ.isLoading}
            to="/servers/monitored"
            positive
            description={`Servers with the Azure Monitor Agent extension installed (${amaInstalled}/${totalServers})`}
          />
          {!totalServersQ.isLoading && (
            <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginTop: tokens.spacingVerticalXS }}>
              {totalServers} total server{totalServers !== 1 ? "s" : ""} across all subscriptions.{" "}
              <Link onClick={() => {}}>Go to Servers →</Link>
            </Text>
          )}
        </Card>

        {/* Services section */}
        <Card className={styles.section}>
          <Title3>Services</Title3>

          <MetricRow
            icon={green}
            label="Monitored Services"
            count={monitoredServices}
            loading={allPaaSQ.isLoading}
            to="/services/monitored"
            positive
            description="AMBA-catalog PaaS resources that have at least one alert rule targeting them"
          />
          <MetricRow
            icon={noAlerts > 0 ? danger : green}
            label="No Alert Rules"
            count={noAlerts}
            loading={allPaaSQ.isLoading}
            to="/services/monitored"
            description="AMBA-catalog PaaS resources with zero alert rules targeting them (-40 pts each)"
          />

          {!allPaaSQ.isLoading && (
            <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginTop: tokens.spacingVerticalXS }}>
              {totalServices} total service{totalServices !== 1 ? "s" : ""} across all subscriptions.{" "}
              <Link onClick={() => {}}>Go to Services →</Link>
            </Text>
          )}
        </Card>
      </div>
    </div>
  );
}
