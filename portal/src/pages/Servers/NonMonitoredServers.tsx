import { useState } from "react";
import {
  DataGrid,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridBody,
  DataGridRow,
  DataGridCell,
  createTableColumn,
  Button,
  Spinner,
  Text,
  Title3,
  Toolbar,
  makeStyles,
  tokens,
  type DataGridProps,
} from "@fluentui/react-components";
import {
  ArrowSyncRegular,
  CheckmarkCircleFilled,
  DismissCircleFilled,
} from "@fluentui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useARGQuery } from "../../hooks/useARGQuery";
import { useBackendAction } from "../../hooks/useBackendAction";
import { useConfig } from "../../hooks/useConfig";
import { ARG_NON_MONITORED_VMS } from "../../services/queries/argQueries";
import { PackSelector } from "../../components/shared/PackSelector";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  toolbar: {
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalS,
  },
  stoppedRow: {
    opacity: 0.45,
  },
});

interface VMRow {
  Resource: string;
  "Resource Group": string;
  OS: string;
  subscriptionId: string;
  Location: string;
  state?: string;
}

const stateIcon = (state?: string) =>
  state === "On" ? (
    <CheckmarkCircleFilled style={{ color: tokens.colorPaletteGreenForeground1 }} />
  ) : (
    <DismissCircleFilled style={{ color: tokens.colorPaletteRedForeground1 }} />
  );

const resourceName = (id: string) => id.split("/").pop() ?? id;

const columns = [
  createTableColumn<VMRow>({
    columnId: "state",
    renderHeaderCell: () => "Started",
    renderCell: (item) => stateIcon(item.state),
  }),
  createTableColumn<VMRow>({
    columnId: "name",
    renderHeaderCell: () => "Name",
    renderCell: (item) => resourceName(item.Resource),
    compare: (a, b) => resourceName(a.Resource).localeCompare(resourceName(b.Resource)),
  }),
  createTableColumn<VMRow>({
    columnId: "resourceGroup",
    renderHeaderCell: () => "Resource Group",
    renderCell: (item) => item["Resource Group"],
    compare: (a, b) => a["Resource Group"].localeCompare(b["Resource Group"]),
  }),
  createTableColumn<VMRow>({
    columnId: "OS",
    renderHeaderCell: () => "OS",
    renderCell: (item) => item.OS ?? "",
  }),
  createTableColumn<VMRow>({
    columnId: "Location",
    renderHeaderCell: () => "Location",
    renderCell: (item) => item.Location,
    compare: (a, b) => a.Location.localeCompare(b.Location),
  }),
];

export function NonMonitoredServers() {
  const styles = useStyles();
  const { config } = useConfig();
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedPacks, setSelectedPacks] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const vmsQuery = useARGQuery(
    ["nonMonitoredVMs"],
    ARG_NON_MONITORED_VMS,
    { enabled: true }
  );

  const rows = (vmsQuery.data ?? []) as unknown as VMRow[];

  const action = useBackendAction({
    onSuccess: () => {
      setDialogOpen(false);
      setSelectedIds(new Set());
      setSelectedPacks([]);
      queryClient.invalidateQueries({ queryKey: ["nonMonitoredVMs"] });
      queryClient.invalidateQueries({ queryKey: ["taggedVMs"] });
    },
  });

  const selectedRows = rows.filter((r) => selectedIds.has(r.Resource));

  const handleConfirm = () => {
    // Backend expects objects with Resource, OS, Location properties
    const resourceObjects = selectedRows.map((r) => ({
      Resource: r.Resource,
      OS: r.OS,
      Location: r.Location,
    }));

    action.mutate({
      endpoint: "packmgmt",
      body: {
        Action: "AddPack",
        Resources: resourceObjects,
        Pack: selectedPacks.join(","),
        PackType: "IaaS",
        WorkspaceId: config.workspaceId,
        AzureMonitorWorkspaceId: config.azureMonitorWorkspaceId,
        DefaultAG: config.actionGroupId,
      },
    });
  };



  const onSelectionChange: DataGridProps["onSelectionChange"] = (_, data) => {
    setSelectedIds(data.selectedItems as Set<string>);
  };

  if (vmsQuery.isLoading) {
    return <Spinner size="medium" label="Loading non-monitored machines..." />;
  }

  if (vmsQuery.isError) {
    return <Text style={{ color: tokens.colorPaletteRedForeground1 }}>Error: {String(vmsQuery.error)}</Text>;
  }

  return (
    <div className={styles.container}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Title3>Non-Monitored Machines</Title3>
        <Button
          appearance="subtle"
          icon={<ArrowSyncRegular style={vmsQuery.isFetching ? { animation: "spin 1s linear infinite" } : undefined} />}
          onClick={() => queryClient.invalidateQueries({ queryKey: ["nonMonitoredVMs"] })}
          disabled={vmsQuery.isFetching}
          title="Refresh"
        />
      </div>

      {selectedIds.size > 0 && (
        <>
          <PackSelector
            selectedPacks={selectedPacks}
            onSelectionChange={setSelectedPacks}
            label="Enable Pack(s)"
          />
          <Toolbar className={styles.toolbar}>
            <Button
              appearance="primary"
              disabled={selectedPacks.length === 0}
              onClick={() => setDialogOpen(true)}
            >
              Enable Monitoring
            </Button>
          </Toolbar>
        </>
      )}

      {rows.length > 0 ? (
        <DataGrid
          items={rows}
          columns={columns}
          sortable
          selectionMode="multiselect"
          selectedItems={selectedIds}
          onSelectionChange={onSelectionChange}
          getRowId={(item) => item.Resource}
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => (
                <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<VMRow>>
            {({ item, rowId }) => (
              <DataGridRow<VMRow>
                key={rowId}
                className={item.state !== "On" ? styles.stoppedRow : undefined}
              >
                {({ renderCell }) => (
                  <DataGridCell>{renderCell(item)}</DataGridCell>
                )}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      ) : (
        <Text>No unmonitored servers. Good job!</Text>
      )}

      <ConfirmDialog
        open={dialogOpen}
        title={`Enable Monitoring — ${selectedPacks.join(", ")}`}
        onConfirm={handleConfirm}
        onCancel={() => setDialogOpen(false)}
        isPending={action.isPending}
      >
        <Text>
          Enable monitoring for <strong>{selectedPacks.join(", ")}</strong> on{" "}
          <strong>{selectedRows.length}</strong> machine(s)?
        </Text>
        <ul>
          {selectedRows.slice(0, 10).map((r) => (
            <li key={r.Resource}>{resourceName(r.Resource)}</li>
          ))}
          {selectedRows.length > 10 && (
            <li>...and {selectedRows.length - 10} more</li>
          )}
        </ul>
      </ConfirmDialog>
    </div>
  );
}
