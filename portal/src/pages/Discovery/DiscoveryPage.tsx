import { useState } from "react";
import { Title2, TabList, Tab, makeStyles, tokens } from "@fluentui/react-components";
import { DiscoveryResults } from "./DiscoveryResults";
import { DiscoveryConfig } from "./DiscoveryConfig";
import { DiscoveryData } from "./DiscoveryData";

const useStyles = makeStyles({
  container: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM, padding: tokens.spacingVerticalM },
});

type DiscTab = "results" | "config" | "data";

export function DiscoveryPage() {
  const s = useStyles();
  const [tab, setTab] = useState<DiscTab>("results");
  return (
    <div className={s.container}>
      <Title2>Discovery</Title2>
      <TabList selectedValue={tab} onTabSelect={(_e, d) => setTab(d.value as DiscTab)}>
        <Tab value="results">Results</Tab>
        <Tab value="config">Configuration</Tab>
        <Tab value="data">Raw Data</Tab>
      </TabList>
      {tab === "results" && <DiscoveryResults />}
      {tab === "config" && <DiscoveryConfig />}
      {tab === "data" && <DiscoveryData />}
    </div>
  );
}
