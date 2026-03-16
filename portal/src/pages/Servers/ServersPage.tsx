import {
  makeStyles,
  tokens,
  Title2,
} from "@fluentui/react-components";
import { MonitoredServers } from "./MonitoredServers";
import { NonMonitoredServers } from "./NonMonitoredServers";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
  splitPane: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: tokens.spacingHorizontalL,
    "@media (max-width: 1200px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export function ServersPage() {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Title2>Servers</Title2>
      <div className={styles.splitPane}>
        <MonitoredServers />
        <NonMonitoredServers />
      </div>
    </div>
  );
}
