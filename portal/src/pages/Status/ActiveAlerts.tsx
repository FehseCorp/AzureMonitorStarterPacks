import {
  DataGrid,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridBody,
  DataGridRow,
  DataGridCell,
  createTableColumn,
  Badge,
  Link,
  Spinner,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useARGQuery } from "../../hooks/useARGQuery";
import { useConfig } from "../../hooks/useConfig";
import { argActiveAlerts } from "../../services/queries/argQueries";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
});

interface AlertRow {
  id: string;
  AlertName: string;
  Details: string;
  Status: string;
  Resource: string;
  Sev: string;
}

const severityColor = (sev: string) => {
  switch (sev) {
    case "Sev0": return "danger" as const;
    case "Sev1": return "danger" as const;
    case "Sev2": return "warning" as const;
    case "Sev3": return "informative" as const;
    default: return "informative" as const;
  }
};

const columns = [
  createTableColumn<AlertRow>({
    columnId: "Sev",
    renderHeaderCell: () => "Severity",
    renderCell: (item) => (
      <Badge appearance="filled" color={severityColor(item.Sev)}>
        {item.Sev}
      </Badge>
    ),
    compare: (a, b) => a.Sev.localeCompare(b.Sev),
  }),
  createTableColumn<AlertRow>({
    columnId: "AlertName",
    renderHeaderCell: () => "Alert Name",
    renderCell: (item) => item.AlertName,
    compare: (a, b) => a.AlertName.localeCompare(b.AlertName),
  }),
  createTableColumn<AlertRow>({
    columnId: "Resource",
    renderHeaderCell: () => "Resource",
    renderCell: (item) => {
      const resourceName = item.Resource?.split("/").pop() ?? item.Resource;
      const portalUrl = `https://portal.azure.com/#@/resource${item.Resource}`;
      return (
        <Link href={portalUrl} target="_blank">
          {resourceName}
        </Link>
      );
    },
    compare: (a, b) => (a.Resource ?? "").localeCompare(b.Resource ?? ""),
  }),
  createTableColumn<AlertRow>({
    columnId: "Status",
    renderHeaderCell: () => "Status",
    renderCell: (item) => item.Status,
  }),
  createTableColumn<AlertRow>({
    columnId: "Details",
    renderHeaderCell: () => "Details",
    renderCell: (item) => {
      const portalUrl = `https://portal.azure.com/#@/resource${item.Details}`;
      return (
        <Link href={portalUrl} target="_blank">
          View
        </Link>
      );
    },
  }),
];

export function ActiveAlerts() {
  const styles = useStyles();
  const { config } = useConfig();

  const alertsQuery = useARGQuery(
    ["activeAlerts", config.instanceName],
    argActiveAlerts(config.instanceName),
    { enabled: !!config.instanceName }
  );

  const alerts = (alertsQuery.data ?? []) as unknown as AlertRow[];

  if (!config.instanceName) {
    return <Text>Please select an instance in the Configuration tab first.</Text>;
  }

  if (alertsQuery.isLoading) {
    return <Spinner size="medium" label="Loading alerts..." />;
  }

  if (alertsQuery.isError) {
    return (
      <Text style={{ color: tokens.colorPaletteRedForeground1 }}>
        Error loading alerts: {String(alertsQuery.error)}
      </Text>
    );
  }

  return (
    <div className={styles.container}>
      <Text weight="semibold">
        {alerts.length} active alert{alerts.length !== 1 ? "s" : ""}
      </Text>
      {alerts.length > 0 ? (
        <DataGrid
          items={alerts}
          columns={columns}
          sortable
          getRowId={(item) => item.id}
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => (
                <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<AlertRow>>
            {({ item, rowId }) => (
              <DataGridRow<AlertRow> key={rowId}>
                {({ renderCell }) => (
                  <DataGridCell>{renderCell(item)}</DataGridCell>
                )}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      ) : (
        <Text>No active alerts.</Text>
      )}
    </div>
  );
}
