import { useState, useMemo } from "react";
import {
  DataGrid,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridBody,
  DataGridRow,
  DataGridCell,
  createTableColumn,
  Badge,
  Spinner,
  Text,
  Title3,
  makeStyles,
  tokens,
  type DataGridProps,
} from "@fluentui/react-components";
import { useARGQuery } from "../../hooks/useARGQuery";
import { useConfig } from "../../hooks/useConfig";
import { argVMInsightsServers, argVMInsightsDCRs } from "../../services/queries/argQueries";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  splitPane: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: tokens.spacingHorizontalL,
    "@media (max-width: 1200px)": {
      gridTemplateColumns: "1fr",
    },
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  drillDown: {
    padding: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    marginTop: tokens.spacingVerticalS,
  },
});

interface VMInsightsDCRRow {
  dcrId: string;
  dcrName: string;
  location: string;
  ServerCount: number;
}

interface VMInsightsServerRow {
  dcrName: string;
  resourceId: string;
  resourceName: string;
}

const dcrColumns = [
  createTableColumn<VMInsightsDCRRow>({
    columnId: "dcrName",
    renderHeaderCell: () => "DCR Name",
    renderCell: (item) => item.dcrName,
    compare: (a, b) => a.dcrName.localeCompare(b.dcrName),
  }),
  createTableColumn<VMInsightsDCRRow>({
    columnId: "location",
    renderHeaderCell: () => "Location",
    renderCell: (item) => item.location,
  }),
  createTableColumn<VMInsightsDCRRow>({
    columnId: "serverCount",
    renderHeaderCell: () => "Servers",
    renderCell: (item) => (
      <Badge color={item.ServerCount > 0 ? "success" : "warning"}>
        {item.ServerCount}
      </Badge>
    ),
    compare: (a, b) => a.ServerCount - b.ServerCount,
  }),
];

const serverColumns = [
  createTableColumn<VMInsightsServerRow>({
    columnId: "resourceName",
    renderHeaderCell: () => "Server",
    renderCell: (item) => item.resourceName,
    compare: (a, b) => a.resourceName.localeCompare(b.resourceName),
  }),
  createTableColumn<VMInsightsServerRow>({
    columnId: "dcrName",
    renderHeaderCell: () => "DCR",
    renderCell: (item) => item.dcrName,
    compare: (a, b) => a.dcrName.localeCompare(b.dcrName),
  }),
];

export function VMInsightsStatus() {
  const styles = useStyles();
  const { config } = useConfig();
  const instance = config.instanceName;
  const [selectedDCRId, setSelectedDCRId] = useState<Set<string>>(new Set());

  const dcrsQ = useARGQuery(
    ["vmInsightsDCRs", instance],
    argVMInsightsDCRs(instance),
    { enabled: !!instance }
  );

  const serversQ = useARGQuery(
    ["vmInsightsServers", instance],
    argVMInsightsServers(instance),
    { enabled: !!instance }
  );

  const dcrRows: VMInsightsDCRRow[] = useMemo(() => {
    return (dcrsQ.data ?? []) as unknown as VMInsightsDCRRow[];
  }, [dcrsQ.data]);

  const allServers: VMInsightsServerRow[] = useMemo(() => {
    return (serversQ.data ?? []) as unknown as VMInsightsServerRow[];
  }, [serversQ.data]);

  // Filter servers for selected DCR
  const selectedDCR = dcrRows.find((r) => selectedDCRId.has(r.dcrId));
  const filteredServers = useMemo(() => {
    if (!selectedDCR) return allServers;
    return allServers.filter((s) => s.dcrName === selectedDCR.dcrName);
  }, [allServers, selectedDCR]);

  const onDCRSelectionChange: DataGridProps["onSelectionChange"] = (_, data) => {
    setSelectedDCRId(data.selectedItems as Set<string>);
  };

  if (!instance) {
    return <Text>Please select an instance in the Configuration tab first.</Text>;
  }

  if (dcrsQ.isLoading || serversQ.isLoading) {
    return <Spinner size="medium" label="Loading VMInsights status..." />;
  }

  return (
    <div className={styles.container}>
      <Title3>VM Insights Status</Title3>
      <div className={styles.splitPane}>
        <div className={styles.panel}>
          <Text weight="semibold">VM Insights DCRs</Text>
          <Text size={200}>Select a DCR to filter servers.</Text>
          {dcrRows.length > 0 ? (
            <DataGrid
              items={dcrRows}
              columns={dcrColumns}
              sortable
              selectionMode="multiselect"
              selectedItems={selectedDCRId}
              onSelectionChange={onDCRSelectionChange}
              getRowId={(item) => item.dcrId}
            >
              <DataGridHeader>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<VMInsightsDCRRow>>
                {({ item, rowId }) => (
                  <DataGridRow<VMInsightsDCRRow> key={rowId}>
                    {({ renderCell }) => (
                      <DataGridCell>{renderCell(item)}</DataGridCell>
                    )}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>
          ) : (
            <Text>No VM Insights DCRs found.</Text>
          )}
        </div>
        <div className={styles.panel}>
          <Text weight="semibold">
            {selectedDCR
              ? `Servers for ${selectedDCR.dcrName}`
              : "All VM Insights Servers"}
          </Text>
          {filteredServers.length > 0 ? (
            <DataGrid
              items={filteredServers}
              columns={serverColumns}
              sortable
              getRowId={(item) => item.resourceId}
            >
              <DataGridHeader>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<VMInsightsServerRow>>
                {({ item, rowId }) => (
                  <DataGridRow<VMInsightsServerRow> key={rowId}>
                    {({ renderCell }) => (
                      <DataGridCell>{renderCell(item)}</DataGridCell>
                    )}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>
          ) : (
            <Text>No VM Insights servers found.</Text>
          )}
        </div>
      </div>
    </div>
  );
}
