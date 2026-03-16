import {
  makeStyles,
  tokens,
  Spinner,
  Text,
  Title3,
} from "@fluentui/react-components";
import { PieChartWidget } from "../../components/common/PieChartWidget";
import { TilesWidget } from "../../components/common/TilesWidget";
import { useARGQuery } from "../../hooks/useARGQuery";
import { useConfig } from "../../hooks/useConfig";
import {
  argMonitoringStatus,
  argAgentStatus,
  argServersPerPack,
  ARG_TAGGED_RESOURCES,
} from "../../services/queries/argQueries";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
  chartRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalL,
  },
  chartCell: {
    flex: "1 1 300px",
    minWidth: "280px",
  },
});

export function IaaSSummary() {
  const styles = useStyles();
  const { config } = useConfig();
  const instance = config.instanceName;

  const monStatusQ = useARGQuery(
    ["monitoringStatus", instance],
    argMonitoringStatus(instance),
    { enabled: !!instance }
  );
  const agentQ = useARGQuery(
    ["agentStatus", instance],
    argAgentStatus(instance),
    { enabled: !!instance }
  );
  const packsQ = useARGQuery(
    ["serversPerPack", instance],
    argServersPerPack(instance),
    { enabled: !!instance }
  );
  const taggedQ = useARGQuery(
    ["taggedResources"],
    ARG_TAGGED_RESOURCES,
    { enabled: true }
  );

  if (!instance) {
    return <Text>Please select an instance in the Configuration tab first.</Text>;
  }

  const toChartData = (rows: Record<string, unknown>[] | undefined, nameKey: string, valueKey: string) =>
    (rows ?? []).map((r) => ({
      name: String(r[nameKey] ?? "Unknown"),
      value: Number(r[valueKey] ?? 0),
    }));

  const taggedRows = (taggedQ.data ?? []) as Record<string, unknown>[];
  const tiles = taggedRows.map((r) => ({
    label: String(r["MPs"] ?? ""),
    value: Number(r["Total"] ?? 0),
  }));

  return (
    <div className={styles.container}>
      <div className={styles.chartRow}>
        <div className={styles.chartCell}>
          <PieChartWidget
            title="Monitoring Status"
            data={toChartData(monStatusQ.data as Record<string, unknown>[] | undefined, "MonitorStatus", "count_")}
            isLoading={monStatusQ.isLoading}
            error={monStatusQ.error}
          />
        </div>
        <div className={styles.chartCell}>
          <PieChartWidget
            title="Agent Install Status"
            data={toChartData(agentQ.data as Record<string, unknown>[] | undefined, "AgentInstalled", "count_")}
            isLoading={agentQ.isLoading}
            error={agentQ.error}
          />
        </div>
        <div className={styles.chartCell}>
          <PieChartWidget
            title="Servers per Pack"
            data={toChartData(packsQ.data as Record<string, unknown>[] | undefined, "Pack", "Associated")}
            isLoading={packsQ.isLoading}
            error={packsQ.error}
          />
        </div>
      </div>
      <div>
        <Title3>Tagged Resources</Title3>
        {taggedQ.isLoading ? (
          <Spinner size="small" label="Loading..." />
        ) : taggedQ.isError ? (
          <Text style={{ color: tokens.colorPaletteRedForeground1 }}>
            Error: {String(taggedQ.error)}
          </Text>
        ) : tiles.length > 0 ? (
          <TilesWidget tiles={tiles} />
        ) : (
          <Text>No tagged resources found.</Text>
        )}
      </div>
    </div>
  );
}
