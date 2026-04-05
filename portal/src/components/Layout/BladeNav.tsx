import {
  Nav,
  NavCategory,
  NavCategoryItem,
  NavItem,
  NavSubItem,
  NavSubItemGroup,
  NavSectionHeader,
  NavDivider,
  type OnNavItemSelectData,
  makeStyles,
  tokens,
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

const useStyles = makeStyles({
  nav: {
    width: "240px",
    minWidth: "240px",
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    overflowY: "auto",
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalL,
  },
});

export function BladeNav() {
  const s = useStyles();
  const navigate = useNavigate();
  const location = useLocation();

  const path = location.pathname;

  // Determine the selected nav value from the current route
  const selectedValue =
    path === "/" ? "/" : path;

  // Default sub-routes: when navigating to a parent, redirect to the first child
  const defaultChildren: Record<string, string> = {
    "/status": "/status/summary",
    "/alerts": "/alerts/pack",
    "/packs": "/packs/associations",
    "/agents": "/agents/management",
    "/servers": "/servers/monitored",
    "/services": "/services/monitored",
    "/discovery": "/discovery/results",
  };

  const handleSelect = (_: unknown, data: OnNavItemSelectData) => {
    const target = data.value as string;
    navigate(defaultChildren[target] ?? target);
  };

  return (
    <nav className={s.nav}>
      <Nav selectedValue={selectedValue} onNavItemSelect={handleSelect}>
        <NavItem icon={<HomeRegular />} value="/">
          Getting Started
        </NavItem>

        <NavDivider />
        <NavSectionHeader>Monitoring</NavSectionHeader>

        <NavCategory value="/status">
          <NavCategoryItem icon={<PulseRegular />}>Status</NavCategoryItem>
          <NavSubItemGroup>
            <NavSubItem value="/status/summary">Summary</NavSubItem>
            <NavSubItem value="/status/alerts">Active Alerts</NavSubItem>
            <NavSubItem value="/status/iaas">IaaS Summary</NavSubItem>
            <NavSubItem value="/status/services">Services Summary</NavSubItem>
            <NavSubItem value="/status/dashboards">Dashboards</NavSubItem>
          </NavSubItemGroup>
        </NavCategory>

        <NavCategory value="/servers">
          <NavCategoryItem icon={<ServerRegular />}>Servers</NavCategoryItem>
          <NavSubItemGroup>
            <NavSubItem value="/servers/monitored">Monitored</NavSubItem>
            <NavSubItem value="/servers/non-monitored">Non-Monitored</NavSubItem>
          </NavSubItemGroup>
        </NavCategory>

        <NavCategory value="/services">
          <NavCategoryItem icon={<CloudRegular />}>Services</NavCategoryItem>
          <NavSubItemGroup>
            <NavSubItem value="/services/monitored">Monitored</NavSubItem>
            <NavSubItem value="/services/non-monitored">Non-Monitored</NavSubItem>
          </NavSubItemGroup>
        </NavCategory>

        <NavCategory value="/alerts">
          <NavCategoryItem icon={<AlertRegular />}>Alert Rules</NavCategoryItem>
          <NavSubItemGroup>
            <NavSubItem value="/alerts/pack">Pack Alerts</NavSubItem>
            <NavSubItem value="/alerts/other">Other Alerts</NavSubItem>
          </NavSubItemGroup>
        </NavCategory>

        <NavDivider />
        <NavSectionHeader>Configuration</NavSectionHeader>

        <NavCategory value="/packs">
          <NavCategoryItem icon={<BoxRegular />}>Packs</NavCategoryItem>
          <NavSubItemGroup>
            <NavSubItem value="/packs/associations">Associations</NavSubItem>
            <NavSubItem value="/packs/dcr">DCR Details</NavSubItem>
            <NavSubItem value="/packs/vminsights">VM Insights</NavSubItem>
            <NavSubItem value="/packs/import">Import Pack</NavSubItem>
            <NavSubItem value="/packs/details">Pack Details</NavSubItem>
          </NavSubItemGroup>
        </NavCategory>

        <NavCategory value="/agents">
          <NavCategoryItem icon={<PlugConnectedRegular />}>Agents</NavCategoryItem>
          <NavSubItemGroup>
            <NavSubItem value="/agents/management">Management</NavSubItem>
            <NavSubItem value="/agents/heartbeat">Heartbeat</NavSubItem>
            <NavSubItem value="/agents/otel-heartbeat">OTel Heartbeat</NavSubItem>
            <NavSubItem value="/agents/vmapps">VM Applications</NavSubItem>
          </NavSubItemGroup>
        </NavCategory>

        <NavCategory value="/discovery">
          <NavCategoryItem icon={<SearchRegular />}>Discovery</NavCategoryItem>
          <NavSubItemGroup>
            <NavSubItem value="/discovery/results">Results</NavSubItem>
            <NavSubItem value="/discovery/config">Configuration</NavSubItem>
            <NavSubItem value="/discovery/data">Raw Data</NavSubItem>
          </NavSubItemGroup>
        </NavCategory>

        <NavDivider />

        <NavItem icon={<SettingsRegular />} value="/configuration">
          Configuration
        </NavItem>

        <NavItem icon={<DocumentTextRegular />} value="/logs">
          Logs
        </NavItem>
      </Nav>
    </nav>
  );
}
