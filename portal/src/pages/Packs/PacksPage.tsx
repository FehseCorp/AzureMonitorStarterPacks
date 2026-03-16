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
import { PackAssociations } from "./PackAssociations";
import { DCRDetails } from "./DCRDetails";
import { VMInsightsStatus } from "./VMInsightsStatus";
import { ImportPack } from "./ImportPack";
import { PackDetails } from "./PackDetails";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
});

type PackTab = "associations" | "dcr" | "vminsights" | "import" | "details";

export function PacksPage() {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<PackTab>("associations");

  return (
    <div className={styles.container}>
      <Title2>Packs & Data Collection Rules</Title2>
      <Divider />
      <TabList
        selectedValue={selectedTab}
        onTabSelect={(_, data: SelectTabData) => setSelectedTab(data.value as PackTab)}
      >
        <Tab value="associations">Associations</Tab>
        <Tab value="dcr">DCR Details</Tab>
        <Tab value="vminsights">VM Insights</Tab>
        <Tab value="import">Import Pack</Tab>
        <Tab value="details">Pack Details</Tab>
      </TabList>
      {selectedTab === "associations" && <PackAssociations />}
      {selectedTab === "dcr" && <DCRDetails />}
      {selectedTab === "vminsights" && <VMInsightsStatus />}
      {selectedTab === "import" && <ImportPack />}
      {selectedTab === "details" && <PackDetails />}
    </div>
  );
}
