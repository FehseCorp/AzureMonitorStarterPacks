import { useState } from "react";
import {
  Tab,
  TabList,
  makeStyles,
  tokens,
  Title2,
} from "@fluentui/react-components";
import { ActiveAlerts } from "./ActiveAlerts";
import { IaaSSummary } from "./IaaSSummary";
import { ServicesSummary } from "./ServicesSummary";
import { Dashboards } from "./Dashboards";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
  content: {
    paddingTop: tokens.spacingVerticalM,
  },
});

type SubTab = "alerts" | "iaas" | "services" | "dashboards";

export function StatusPage() {
  const styles = useStyles();
  const [tab, setTab] = useState<SubTab>("alerts");

  return (
    <div className={styles.container}>
      <Title2>Status</Title2>
      <TabList
        selectedValue={tab}
        onTabSelect={(_, d) => setTab(d.value as SubTab)}
      >
        <Tab value="alerts">Active Alerts</Tab>
        <Tab value="iaas">IaaS Summary</Tab>
        <Tab value="services">Services Summary</Tab>
        <Tab value="dashboards">Dashboards</Tab>
      </TabList>
      <div className={styles.content}>
        {tab === "alerts" && <ActiveAlerts />}
        {tab === "iaas" && <IaaSSummary />}
        {tab === "services" && <ServicesSummary />}
        {tab === "dashboards" && <Dashboards />}
      </div>
    </div>
  );
}
