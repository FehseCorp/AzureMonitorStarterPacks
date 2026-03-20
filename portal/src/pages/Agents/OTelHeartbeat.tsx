import {
  Text,
  Title3,
  makeStyles,
  tokens,
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components";

const useStyles = makeStyles({
  container: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
});

export function OTelHeartbeat() {
  const s = useStyles();
  return (
    <div className={s.container}>
      <Title3>OpenTelemetry Heartbeat</Title3>
      <MessageBar intent="info">
        <MessageBarBody>
          <Text weight="semibold">Coming soon.</Text>{" "}
          This tab will show liveness data for servers reporting OTel Prometheus metrics
          (<code>system_uptime</code>) to the Azure Monitor Workspace.
        </MessageBarBody>
      </MessageBar>
    </div>
  );
}
