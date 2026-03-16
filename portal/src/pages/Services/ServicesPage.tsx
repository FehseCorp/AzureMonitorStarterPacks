import {
  makeStyles,
  tokens,
  Title2,
  Divider,
} from "@fluentui/react-components";
import { MonitoredServices } from "./MonitoredServices";
import { NonMonitoredServices } from "./NonMonitoredServices";

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

export function ServicesPage() {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Title2>Azure Services</Title2>
      <Divider />
      <div className={styles.splitPane}>
        <MonitoredServices />
        <NonMonitoredServices />
      </div>
    </div>
  );
}
