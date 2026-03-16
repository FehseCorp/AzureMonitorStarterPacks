import { useState } from "react";
import {
  makeStyles,
  tokens,
  Title2,
  Divider,
  Tab,
  TabList,
  type SelectTabData,
} from "@fluentui/react-components";
import { PackAlerts } from "./PackAlerts";
import { OtherAlerts } from "./OtherAlerts";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
});

type AlertTab = "pack" | "other";

export function AlertRulesPage() {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<AlertTab>("pack");

  return (
    <div className={styles.container}>
      <Title2>Alert Rules</Title2>
      <Divider />
      <TabList
        selectedValue={selectedTab}
        onTabSelect={(_, data: SelectTabData) => setSelectedTab(data.value as AlertTab)}
      >
        <Tab value="pack">Pack Alerts</Tab>
        <Tab value="other">Other Alerts</Tab>
      </TabList>
      {selectedTab === "pack" ? <PackAlerts /> : <OtherAlerts />}
    </div>
  );
}
