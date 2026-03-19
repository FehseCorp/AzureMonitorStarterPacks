import { useMsal } from "@azure/msal-react";
import {
  makeStyles,
  tokens,
  Title3,
  Button,
} from "@fluentui/react-components";
import { SignOutRegular, WeatherMoonRegular, WeatherSunnyRegular } from "@fluentui/react-icons";
import { TabNavigation } from "./TabNavigation";
import { DiagnosticsPanel } from "../DiagnosticsPanel";
import { useTheme } from "../../hooks/useTheme";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  title: {
    color: tokens.colorNeutralForegroundOnBrand,
  },
  nav: {
    padding: `0 ${tokens.spacingHorizontalL}`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  content: {
    flex: 1,
    padding: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
  },
});

export function AppShell({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const { mode, toggle } = useTheme();

  const handleLogout = () => {
    instance.logoutRedirect();
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Title3 className={styles.title}>
          Azure Monitor Starter Packs — Admin Portal
        </Title3>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Button
            appearance="transparent"
            icon={mode === "dark" ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
            onClick={toggle}
            style={{ color: tokens.colorNeutralForegroundOnBrand }}
            title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          />
          {account && (
            <Button
              appearance="transparent"
              icon={<SignOutRegular />}
              onClick={handleLogout}
              style={{ color: tokens.colorNeutralForegroundOnBrand }}
            >
              {account.name ?? account.username}
            </Button>
          )}
        </div>
      </header>
      <nav className={styles.nav}>
        <TabNavigation />
      </nav>
      <main className={styles.content}>{children}</main>
      <DiagnosticsPanel />
    </div>
  );
}
