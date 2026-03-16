import { useState } from "react";
import { Title2, TabList, Tab, makeStyles, tokens } from "@fluentui/react-components";
import { AgentsList } from "./AgentsList";
import { Heartbeat } from "./Heartbeat";
import { VMApplications } from "./VMApplications";

const useStyles = makeStyles({
  container: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM, padding: tokens.spacingVerticalM },
});

type AgentTab = "agents" | "heartbeat" | "vmapps";

export function AgentsPage() {
  const s = useStyles();
  const [tab, setTab] = useState<AgentTab>("agents");
  return (
    <div className={s.container}>
      <Title2>Agents</Title2>
      <TabList selectedValue={tab} onTabSelect={(_e, d) => setTab(d.value as AgentTab)}>
        <Tab value="agents">Agent Management</Tab>
        <Tab value="heartbeat">Heartbeat</Tab>
        <Tab value="vmapps">VM Applications</Tab>
      </TabList>
      {tab === "agents" && <AgentsList />}
      {tab === "heartbeat" && <Heartbeat />}
      {tab === "vmapps" && <VMApplications />}
    </div>
  );
}
