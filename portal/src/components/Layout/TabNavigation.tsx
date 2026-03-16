import {
  TabList,
  Tab,
  type SelectTabData,
  type SelectTabEvent,
} from "@fluentui/react-components";
import {
  HomeRegular,
  PulseRegular,
  ServerRegular,
  CloudRegular,
  AlertRegular,
  BoxRegular,
  PlugConnectedRegular,
  SearchRegular,
  SettingsRegular,
  DocumentTextRegular,
} from "@fluentui/react-icons";
import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { value: "/", label: "Getting Started", icon: <HomeRegular /> },
  { value: "/status", label: "Status", icon: <PulseRegular /> },
  { value: "/servers", label: "Servers", icon: <ServerRegular /> },
  { value: "/services", label: "Services", icon: <CloudRegular /> },
  { value: "/alerts", label: "Alert Rules", icon: <AlertRegular /> },
  { value: "/packs", label: "Packs", icon: <BoxRegular /> },
  { value: "/agents", label: "Agents", icon: <PlugConnectedRegular /> },
  { value: "/discovery", label: "Discovery", icon: <SearchRegular /> },
  { value: "/configuration", label: "Configuration", icon: <SettingsRegular /> },
  { value: "/logs", label: "Logs", icon: <DocumentTextRegular /> },
];

export function TabNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedTab = tabs.find((t) => t.value === location.pathname)?.value
    ?? tabs.find((t) => t.value !== "/" && location.pathname.startsWith(t.value))?.value
    ?? "/";

  const onTabSelect = (_: SelectTabEvent, data: SelectTabData) => {
    navigate(data.value as string);
  };

  return (
    <TabList
      selectedValue={selectedTab}
      onTabSelect={onTabSelect}
      size="medium"
    >
      {tabs.map((tab) => (
        <Tab key={tab.value} value={tab.value} icon={tab.icon}>
          {tab.label}
        </Tab>
      ))}
    </TabList>
  );
}
