import {
  Title2,
  Title3,
  Text,
  Link,
  Card,
  CardHeader,
  makeStyles,
  tokens,
  MessageBar,
  MessageBarBody,
  Badge,
} from "@fluentui/react-components";
import {
  BoxRegular,
  ServerRegular,
  AlertRegular,
  SearchRegular,
  PlugConnectedRegular,
  SettingsRegular,
  CloudRegular,
  OpenRegular,
} from "@fluentui/react-icons";
import { useConfig } from "../../hooks/useConfig";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    maxWidth: "900px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: tokens.spacingHorizontalM,
  },
  card: {
    padding: tokens.spacingHorizontalM,
  },
  cardIcon: {
    fontSize: "24px",
    color: tokens.colorBrandForeground1,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  links: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
  },
});

export function GettingStartedPage() {
  const s = useStyles();
  const { config } = useConfig();

  return (
    <div className={s.root}>
      <div>
        <Title2>Getting Started</Title2>
        {config.instanceName && (
          <Badge
            appearance="filled"
            color="brand"
            style={{ marginLeft: 12, verticalAlign: "middle" }}
          >
            Instance: {config.instanceName}
          </Badge>
        )}
      </div>

      <Text block>
        Welcome to the Azure Monitor Starter Packs admin portal. This portal
        helps you configure and manage your monitoring solution across Azure
        IaaS and PaaS workloads.
      </Text>

      {!config.functionAppUrl && (
        <MessageBar intent="warning">
          <MessageBarBody>
            This appears to be a first-time setup. Please go to the{" "}
            <strong>Configuration</strong> page to set the required parameters
            before using the portal.
          </MessageBarBody>
        </MessageBar>
      )}

      <div className={s.section}>
        <Title3>What you can do</Title3>
        <div className={s.grid}>
          <Card className={s.card}>
            <CardHeader
              image={<BoxRegular className={s.cardIcon} />}
              header={<Text weight="semibold">Monitoring Packs</Text>}
              description="Enable or disable monitoring packs for VMs or services. Remove all monitoring for a specific resource."
            />
          </Card>
          <Card className={s.card}>
            <CardHeader
              image={<AlertRegular className={s.cardIcon} />}
              header={<Text weight="semibold">Alert Management</Text>}
              description="Enable or disable alerts in bulk. Assign different action groups to alerts or delete alert rules."
            />
          </Card>
          <Card className={s.card}>
            <CardHeader
              image={<SearchRegular className={s.cardIcon} />}
              header={<Text weight="semibold">Discovery</Text>}
              description="Review discovered applications and roles on VMs. Enable packs based on discovery results."
            />
          </Card>
          <Card className={s.card}>
            <CardHeader
              image={<PlugConnectedRegular className={s.cardIcon} />}
              header={<Text weight="semibold">Agent Management</Text>}
              description="Install or remove the Azure Monitor Agent. Review agent heartbeat and health status."
            />
          </Card>
          <Card className={s.card}>
            <CardHeader
              image={<ServerRegular className={s.cardIcon} />}
              header={<Text weight="semibold">Servers (IaaS)</Text>}
              description="View monitored and non-monitored virtual machines. Enable packs per server."
            />
          </Card>
          <Card className={s.card}>
            <CardHeader
              image={<CloudRegular className={s.cardIcon} />}
              header={<Text weight="semibold">Services (PaaS)</Text>}
              description="View monitored and non-monitored Azure services. Manage service-level monitoring."
            />
          </Card>
        </div>
      </div>

      <div className={s.section}>
        <Title3>How it works</Title3>
        <Text block>
          Packs are composed of Data Collection Rules, alert definitions, and
          optional Grafana dashboards. When you enable a pack for a resource, the
          backend function configures the necessary DCR associations and alert
          rules. The Azure Monitor Agent collects the data and sends it to your
          Log Analytics workspace.
        </Text>
        <Text block>
          For VM workloads, Discovery deploys a lightweight script that detects
          installed applications and roles. Results are collected via a DCR and
          analysed by the backend function, letting you enable the right packs
          automatically.
        </Text>
      </div>

      <div className={s.section}>
        <Title3>Resources</Title3>
        <div className={s.links}>
          <Link
            href="https://github.com/Azure/AzureMonitorStarterPacks"
            target="_blank"
            inline
          >
            Azure Monitor Starter Packs repository <OpenRegular />
          </Link>
          <Link href="https://aka.ms/amba" target="_blank" inline>
            Azure Monitor Baseline Alerts (AMBA) <OpenRegular />
          </Link>
        </div>
      </div>

      {config.instanceName && (
        <div className={s.section}>
          <Title3>Current Configuration</Title3>
          <div className={s.grid}>
            <ConfigItem label="Instance" value={config.instanceName} />
            <ConfigItem label="Function App" value={config.functionAppName} />
            <ConfigItem label="Workspace" value={config.workspaceName} />
            <ConfigItem label="App Insights" value={config.appInsightsName} />
            <ConfigItem label="Action Group" value={config.actionGroupName} />
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
        {label}
      </Text>
      <Text block weight="semibold">
        {value || "—"}
      </Text>
    </div>
  );
}
