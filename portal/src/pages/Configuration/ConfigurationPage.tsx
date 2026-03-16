import { useEffect } from "react";
import {
  Title2,
  Card,
  CardHeader,
  makeStyles,
  tokens,
  Dropdown,
  Option,
  Button,
  Label,
  Spinner,
  MessageBar,
  MessageBarBody,
  Text,
  type OptionOnSelectData,
} from "@fluentui/react-components";
import { ArrowResetRegular } from "@fluentui/react-icons";
import { useARGQuery } from "../../hooks/useARGQuery";
import { useConfig } from "../../hooks/useConfig";
import {
  ARG_INSTANCES,
  argFunctionApps,
  argWorkspaces,
  ARG_ACTION_GROUPS,
  argAzureMonitorWorkspaces,
  argGrafanaInstances,
  argAppInsights,
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
  actions: {
    display: "flex",
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalL,
  },
  statusBar: {
    marginTop: tokens.spacingVerticalM,
  },
});

export function ConfigurationPage() {
  const styles = useStyles();
  const { config, updateConfig, resetConfig, isConfigured } = useConfig();

  // 1. Instances query — always runs
  const instancesQuery = useARGQuery("instances", ARG_INSTANCES);

  // 2. Dependent queries — only run when instance is selected
  const functionAppsQuery = useARGQuery(
    ["functionApps", config.instanceName],
    argFunctionApps(config.instanceName),
    { enabled: !!config.instanceName }
  );

  const workspacesQuery = useARGQuery(
    ["workspaces", config.instanceName],
    argWorkspaces(config.instanceName),
    { enabled: !!config.instanceName }
  );

  const actionGroupsQuery = useARGQuery("actionGroups", ARG_ACTION_GROUPS);

  const amwQuery = useARGQuery(
    ["amw", config.instanceName],
    argAzureMonitorWorkspaces(config.instanceName),
    { enabled: !!config.instanceName }
  );

  const grafanaQuery = useARGQuery(
    ["grafana", config.instanceName],
    argGrafanaInstances(config.instanceName),
    { enabled: !!config.instanceName }
  );

  // Auto-resolve Function App URL when function app is selected
  useEffect(() => {
    if (config.functionAppName && !config.functionAppUrl) {
      updateConfig({
        functionAppUrl: `https://${config.functionAppName}.azurewebsites.net`,
      });
    }
  }, [config.functionAppName, config.functionAppUrl, updateConfig]);

  // Auto-resolve App Insights when function app is selected
  const appInsightsQuery = useARGQuery(
    ["appInsights", config.functionAppName],
    argAppInsights(config.functionAppName),
    { enabled: !!config.functionAppName }
  );

  useEffect(() => {
    if (appInsightsQuery.data?.length && !config.appInsightsId) {
      const ai = appInsightsQuery.data[0];
      updateConfig({
        appInsightsId: ai.id as string,
        appInsightsName: ai.name as string,
      });
    }
  }, [appInsightsQuery.data, config.appInsightsId, updateConfig]);

  const instances = (instancesQuery.data ?? []).map(
    (r) => r.instanceNames as string
  );
  const functionApps = (functionAppsQuery.data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
  }));
  const workspaces = (workspacesQuery.data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
  }));
  const actionGroups = (actionGroupsQuery.data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
  }));
  const amws = (amwQuery.data ?? []).map((r) => ({
    id: r.id as string,
    name: r.label as string,
  }));
  const grafanas = (grafanaQuery.data ?? []).map((r) => ({
    id: r.id as string,
    endpoint: r.label as string,
  }));

  const handleSelect =
    (
      idField: string,
      nameField: string,
      items: { id: string; name?: string; endpoint?: string }[]
    ) =>
    (_: unknown, data: OptionOnSelectData) => {
      const selected = items.find((i) => i.id === data.optionValue);
      if (selected) {
        updateConfig({
          [idField]: selected.id,
          [nameField]: selected.name ?? selected.endpoint ?? "",
        });
      }
    };

  return (
    <div className={styles.page}>
      <Title2>Configuration</Title2>

      {isConfigured && (
        <MessageBar intent="success" className={styles.statusBar}>
          <MessageBarBody>
            Configuration saved. Instance: <strong>{config.instanceName}</strong>
          </MessageBarBody>
        </MessageBar>
      )}

      {/* Instance Selector */}
      <Card className={styles.card}>
        <CardHeader header={<Text weight="semibold" size={400}>Instance</Text>} />
        <div className={styles.fieldGrid}>
          <Label>Instance Name</Label>
          {instancesQuery.isLoading ? (
            <Spinner size="tiny" label="Loading instances..." />
          ) : instancesQuery.isError ? (
            <Text style={{ color: tokens.colorPaletteRedForeground1 }}>
              Error loading instances: {String(instancesQuery.error)}
            </Text>
          ) : (
            <Dropdown
              placeholder="Select instance"
              value={config.instanceName || undefined}
              selectedOptions={config.instanceName ? [config.instanceName] : []}
              onOptionSelect={(_, data) => {
                updateConfig({
                  instanceName: data.optionValue ?? "",
                  // Reset dependent selections when instance changes
                  functionAppId: "",
                  functionAppName: "",
                  functionAppUrl: "",
                  workspaceId: "",
                  workspaceName: "",
                  azureMonitorWorkspaceId: "",
                  azureMonitorWorkspaceName: "",
                  grafanaId: "",
                  grafanaEndpoint: "",
                  appInsightsId: "",
                  appInsightsName: "",
                });
              }}
            >
              {instances.map((name) => (
                <Option key={name} value={name}>
                  {name}
                </Option>
              ))}
            </Dropdown>
          )}
        </div>
      </Card>

      {/* Function App + Workspace */}
      {config.instanceName && (
        <Card className={styles.card}>
          <CardHeader header={<Text weight="semibold" size={400}>Backend Resources</Text>} />
          <div className={styles.fieldGrid}>
            <Label>Function App</Label>
            {functionAppsQuery.isLoading ? (
              <Spinner size="tiny" />
            ) : (
              <Dropdown
                placeholder="Select function app"
                value={config.functionAppName || undefined}
                selectedOptions={config.functionAppId ? [config.functionAppId] : []}
                onOptionSelect={handleSelect("functionAppId", "functionAppName", functionApps)}
              >
                {functionApps.map((fa) => (
                  <Option key={fa.id} value={fa.id}>
                    {fa.name}
                  </Option>
                ))}
              </Dropdown>
            )}

            <Label>Log Analytics Workspace</Label>
            {workspacesQuery.isLoading ? (
              <Spinner size="tiny" />
            ) : (
              <Dropdown
                placeholder="Select workspace"
                value={config.workspaceName || undefined}
                selectedOptions={config.workspaceId ? [config.workspaceId] : []}
                onOptionSelect={handleSelect("workspaceId", "workspaceName", workspaces)}
              >
                {workspaces.map((ws) => (
                  <Option key={ws.id} value={ws.id}>
                    {ws.name}
                  </Option>
                ))}
              </Dropdown>
            )}

            <Label>Action Group</Label>
            {actionGroupsQuery.isLoading ? (
              <Spinner size="tiny" />
            ) : (
              <Dropdown
                placeholder="Select action group"
                value={config.actionGroupName || undefined}
                selectedOptions={config.actionGroupId ? [config.actionGroupId] : []}
                onOptionSelect={handleSelect("actionGroupId", "actionGroupName", actionGroups)}
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
      )}

      {/* Optional Resources */}
      {config.instanceName && (
        <Card className={styles.card}>
          <CardHeader header={<Text weight="semibold" size={400}>Optional Resources</Text>} />
          <div className={styles.fieldGrid}>
            <Label>Azure Monitor Workspace</Label>
            {amwQuery.isLoading ? (
              <Spinner size="tiny" />
            ) : (
              <Dropdown
                placeholder="Select AMW (optional)"
                value={config.azureMonitorWorkspaceName || undefined}
                selectedOptions={
                  config.azureMonitorWorkspaceId
                    ? [config.azureMonitorWorkspaceId]
                    : []
                }
                onOptionSelect={handleSelect(
                  "azureMonitorWorkspaceId",
                  "azureMonitorWorkspaceName",
                  amws
                )}
              >
                {amws.map((a) => (
                  <Option key={a.id} value={a.id}>
                    {a.name}
                  </Option>
                ))}
              </Dropdown>
            )}

            <Label>Grafana</Label>
            {grafanaQuery.isLoading ? (
              <Spinner size="tiny" />
            ) : (
              <Dropdown
                placeholder="Select Grafana (optional)"
                value={config.grafanaEndpoint || undefined}
                selectedOptions={config.grafanaId ? [config.grafanaId] : []}
                onOptionSelect={(_, data) => {
                  const selected = grafanas.find(
                    (g) => g.id === data.optionValue
                  );
                  if (selected) {
                    updateConfig({
                      grafanaId: selected.id,
                      grafanaEndpoint: selected.endpoint,
                    });
                  }
                }}
              >
                {grafanas.map((g) => (
                  <Option key={g.id} value={g.id}>
                    {g.endpoint}
                  </Option>
                ))}
              </Dropdown>
            )}

            {config.appInsightsName && (
              <>
                <Label>App Insights</Label>
                <Text>{config.appInsightsName} (auto-detected)</Text>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Current Config Summary */}
      {config.functionAppUrl && (
        <Card className={styles.card}>
          <CardHeader header={<Text weight="semibold" size={400}>Function App URL</Text>} />
          <Text font="monospace">{config.functionAppUrl}</Text>
        </Card>
      )}

      <div className={styles.actions}>
        <Button
          appearance="secondary"
          icon={<ArrowResetRegular />}
          onClick={resetConfig}
        >
          Reset Configuration
        </Button>
      </div>
    </div>
  );
}
