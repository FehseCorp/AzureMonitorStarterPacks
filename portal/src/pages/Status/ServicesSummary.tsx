import {
  makeStyles,
  tokens,
  Text,
} from "@fluentui/react-components";
import { PieChartWidget } from "../../components/common/PieChartWidget";
import { useARGQuery } from "../../hooks/useARGQuery";
import { useConfig } from "../../hooks/useConfig";
import { argPaaSAlertCounts } from "../../services/queries/argQueries";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
  chartWrapper: {
    maxWidth: "500px",
  },
});

export function ServicesSummary() {
  const styles = useStyles();
  const { config } = useConfig();
  const instance = config.instanceName;

  const paasQ = useARGQuery(
    ["paasAlertCounts", instance],
    argPaaSAlertCounts(instance),
    { enabled: !!instance }
  );

  if (!instance) {
    return <Text>Please select an instance in the Configuration tab first.</Text>;
  }

  const rows = (paasQ.data ?? []) as Record<string, unknown>[];
  const chartData = rows.map((r) => ({
    name: String(r["nameSpace"] ?? "Unknown"),
    value: Number(r["Total"] ?? 0),
  }));

  return (
    <div className={styles.container}>
      <div className={styles.chartWrapper}>
        <PieChartWidget
          title="PaaS Alert Counts by Service"
          data={chartData}
          isLoading={paasQ.isLoading}
          error={paasQ.error}
        />
      </div>
    </div>
  );
}
