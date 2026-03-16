import { useMemo } from "react";
import {
  DataGrid,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridBody,
  DataGridRow,
  DataGridCell,
  createTableColumn,
  Link,
  Spinner,
  Text,
  Title3,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useARGQuery } from "../../hooks/useARGQuery";
import { useConfig } from "../../hooks/useConfig";
import { argDCRDetails } from "../../services/queries/argQueries";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
});

interface DCRRow {
  id: string;
  name: string;
  Pack: string;
  location: string;
  kind: string;
  dataSources: Record<string, unknown>;
  destinations: Record<string, unknown>;
  dataFlows: unknown[];
  dataCollectionEndpointId: string;
  resourceGroup: string;
  subscriptionId: string;
}

const summarizeDataSources = (ds: Record<string, unknown> | null) => {
  if (!ds) return "—";
  const parts: string[] = [];
  if (ds.syslog) parts.push("Syslog");
  if (ds.windowsEventLogs) parts.push("Windows Events");
  if (ds.performanceCounters) parts.push("Perf Counters");
  if (ds.extensions) parts.push("Extensions");
  if (ds.logFiles) parts.push("Log Files");
  if (ds.iisLogs) parts.push("IIS Logs");
  return parts.length > 0 ? parts.join(", ") : "None";
};

const summarizeDestinations = (dest: Record<string, unknown> | null) => {
  if (!dest) return "—";
  const parts: string[] = [];
  if (dest.logAnalytics) parts.push("Log Analytics");
  if (dest.azureMonitorMetrics) parts.push("Metrics");
  if (dest.microsoftFabric) parts.push("Fabric");
  return parts.length > 0 ? parts.join(", ") : "None";
};

const portalLink = (id: string) =>
  `https://portal.azure.com/#@/resource${id}`;

const columns = [
  createTableColumn<DCRRow>({
    columnId: "name",
    renderHeaderCell: () => "Name",
    renderCell: (item) => (
      <Link href={portalLink(item.id)} target="_blank" rel="noopener noreferrer">
        {item.name}
      </Link>
    ),
    compare: (a, b) => a.name.localeCompare(b.name),
  }),
  createTableColumn<DCRRow>({
    columnId: "pack",
    renderHeaderCell: () => "Pack",
    renderCell: (item) => item.Pack,
    compare: (a, b) => a.Pack.localeCompare(b.Pack),
  }),
  createTableColumn<DCRRow>({
    columnId: "location",
    renderHeaderCell: () => "Location",
    renderCell: (item) => item.location,
  }),
  createTableColumn<DCRRow>({
    columnId: "dataSources",
    renderHeaderCell: () => "Data Sources",
    renderCell: (item) => summarizeDataSources(item.dataSources),
  }),
  createTableColumn<DCRRow>({
    columnId: "destinations",
    renderHeaderCell: () => "Destinations",
    renderCell: (item) => summarizeDestinations(item.destinations),
  }),
  createTableColumn<DCRRow>({
    columnId: "kind",
    renderHeaderCell: () => "Kind",
    renderCell: (item) => item.kind ?? "—",
  }),
  createTableColumn<DCRRow>({
    columnId: "resourceGroup",
    renderHeaderCell: () => "Resource Group",
    renderCell: (item) => item.resourceGroup,
  }),
];

export function DCRDetails() {
  const styles = useStyles();
  const { config } = useConfig();
  const instance = config.instanceName;

  const query = useARGQuery(
    ["dcrDetails", instance],
    argDCRDetails(instance),
    { enabled: !!instance }
  );

  const rows: DCRRow[] = useMemo(() => {
    return (query.data ?? []) as unknown as DCRRow[];
  }, [query.data]);

  if (!instance) {
    return <Text>Please select an instance in the Configuration tab first.</Text>;
  }

  if (query.isLoading) {
    return <Spinner size="medium" label="Loading DCR details..." />;
  }

  if (query.isError) {
    return <Text style={{ color: tokens.colorPaletteRedForeground1 }}>Error: {String(query.error)}</Text>;
  }

  return (
    <div className={styles.container}>
      <Title3>Data Collection Rule Details</Title3>
      <Text size={200}>Click a DCR name to open it in the Azure Portal.</Text>

      {rows.length > 0 ? (
        <DataGrid
          items={rows}
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
          <DataGridBody<DCRRow>>
            {({ item, rowId }) => (
              <DataGridRow<DCRRow> key={rowId}>
                {({ renderCell }) => (
                  <DataGridCell>{renderCell(item)}</DataGridCell>
                )}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      ) : (
        <Text>No data collection rules found.</Text>
      )}
    </div>
  );
}
