import {
  Title2,
  Card,
  CardHeader,
  makeStyles,
  tokens,
  Dropdown,
  Option,
  Label,
  Spinner,
  MessageBar,
  MessageBarBody,
  Text,
  type OptionOnSelectData,
} from "@fluentui/react-components";
import { useARGQuery } from "../../hooks/useARGQuery";
import { useConfig } from "../../hooks/useConfig";
import {
  ARG_ACTION_GROUPS,
} from "../../services/queries/argQueries";

const useStyles = makeStyles({
  page: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    maxWidth: "800px",
  },
  card: {
    padding: tokens.spacingHorizontalL,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "200px 1fr",
    gap: tokens.spacingVerticalM,
    alignItems: "center",
  },
  statusBar: {
    marginTop: tokens.spacingVerticalM,
  },
  mono: {
    fontFamily: "monospace",
    fontSize: tokens.fontSizeBase200,
    wordBreak: "break-all",
  },
});

function ConfigRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <>
      <Label>{label}</Label>
      <Text className={styles.mono}>{value || "—"}</Text>
    </>
  );
}

export function ConfigurationPage() {
  const styles = useStyles();
  const { config, updateConfig, isConfigured } = useConfig();

  // User-selectable resources (not part of the deployment)
  const actionGroupsQuery = useARGQuery("actionGroups", ARG_ACTION_GROUPS);

  const actionGroups = (actionGroupsQuery.data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
  }));

  return (
    <div className={styles.page}>
      <Title2>Configuration</Title2>

      {isConfigured ? (
        <MessageBar intent="success" className={styles.statusBar}>
          <MessageBarBody>
            Instance <strong>{config.instanceName}</strong> is configured.
          </MessageBarBody>
        </MessageBar>
      ) : (
        <MessageBar intent="warning" className={styles.statusBar}>
          <MessageBarBody>
            Some configuration values are missing. Redeploy the portal or check
            App Service settings.
          </MessageBarBody>
        </MessageBar>
      )}

      {/* Deployment-injected (read-only) */}
      <Card className={styles.card}>
        <CardHeader header={<Text weight="semibold" size={400}>Instance</Text>} />
        <div className={styles.fieldGrid}>
          <ConfigRow label="Instance Name" value={config.instanceName} />
        </div>
      </Card>

      <Card className={styles.card}>
        <CardHeader header={<Text weight="semibold" size={400}>Backend</Text>} />
        <div className={styles.fieldGrid}>
          <ConfigRow label="Function App" value={config.functionAppName} />
          <ConfigRow label="Function App URL" value={config.functionAppUrl} />
          <ConfigRow label="Function App Resource ID" value={config.functionAppId} />
        </div>
      </Card>

      <Card className={styles.card}>
        <CardHeader header={<Text weight="semibold" size={400}>Monitoring</Text>} />
        <div className={styles.fieldGrid}>
          <ConfigRow label="Log Analytics Workspace" value={config.workspaceName} />
          <ConfigRow label="Workspace Resource ID" value={config.workspaceId} />
          <ConfigRow label="App Insights" value={config.appInsightsName} />
          <ConfigRow label="Azure Monitor Workspace" value={config.azureMonitorWorkspaceName} />
        </div>
      </Card>

      {/* User-selectable resources */}
      <Card className={styles.card}>
        <CardHeader header={<Text weight="semibold" size={400}>User Settings</Text>} />
        <div className={styles.fieldGrid}>
          <Label>Action Group</Label>
          {actionGroupsQuery.isLoading ? (
            <Spinner size="tiny" />
          ) : (
            <Dropdown
              placeholder="Select action group"
              value={config.actionGroupName || undefined}
              selectedOptions={config.actionGroupId ? [config.actionGroupId] : []}
              onOptionSelect={(_: unknown, data: OptionOnSelectData) => {
                const selected = actionGroups.find((a) => a.id === data.optionValue);
                if (selected) {
                  updateConfig({ actionGroupId: selected.id, actionGroupName: selected.name });
                }
              }}
            >
              {actionGroups.map((ag) => (
                <Option key={ag.id} value={ag.id}>
                  {ag.name}
                </Option>
              ))}
            </Dropdown>
          )}
        </div>
      </Card>
    </div>
  );
}
