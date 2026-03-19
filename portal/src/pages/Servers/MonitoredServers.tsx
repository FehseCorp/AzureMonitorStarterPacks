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
import { argTaggedVMs, ARG_DCR_ASSOCIATIONS } from "../../services/queries/argQueries";
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
  Packs: string;
  OS: string;
  subscriptionId: string;
  Location: string;
  state: string;
  Associations?: string;
}

const stateIcon = (state: string) =>
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
    columnId: "Packs",
    renderHeaderCell: () => "Packs (Tag)",
    renderCell: (item) => item.Packs ?? "",
  }),
  createTableColumn<VMRow>({
    columnId: "Associations",
    renderHeaderCell: () => "Associations",
    renderCell: (item) => {
      if (!item.Associations) return <Badge appearance="ghost" color="warning">None</Badge>;
      try {
        const list = JSON.parse(item.Associations) as string[];
        return list.join(", ");
      } catch {
        return item.Associations;
      }
    },
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
  }),
];

type DialogAction = "add" | "remove" | "removeAll" | null;

export function MonitoredServers() {
  const styles = useStyles();
  const { config } = useConfig();
  const queryClient = useQueryClient();
  const instance = config.instanceName;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedPacks, setSelectedPacks] = useState<string[]>([]);
  const [dialogAction, setDialogAction] = useState<DialogAction>(null);

  // Queries
  const taggedQ = useARGQuery(
    ["taggedVMs", instance],
    argTaggedVMs(instance),
    { enabled: !!instance }
  );
  const assocQ = useARGQuery(
    ["dcrAssociations"],
    ARG_DCR_ASSOCIATIONS,
    { enabled: true }
  );

  // Merge tagged VMs with DCR associations (client-side left outer join)
  const rows: VMRow[] = useMemo(() => {
    const tagged = (taggedQ.data ?? []) as unknown as VMRow[];
    const assocMap = new Map<string, string>();
    for (const a of (assocQ.data ?? []) as { resourceId: string; Packs2: string }[]) {
      assocMap.set(a.resourceId?.toLowerCase(), a.Packs2);
    }
    return tagged.map((vm) => ({
      ...vm,
      Associations: assocMap.get(vm.Resource?.toLowerCase()) ?? undefined,
    }));
  }, [taggedQ.data, assocQ.data]);

  // Backend action
  const action = useBackendAction({
    onSuccess: () => {
      setDialogAction(null);
      setSelectedIds(new Set());
      setSelectedPacks([]);
      queryClient.invalidateQueries({ queryKey: ["taggedVMs"] });
      queryClient.invalidateQueries({ queryKey: ["dcrAssociations"] });
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

    if (dialogAction === "add") {
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
    } else if (dialogAction === "remove") {
      action.mutate({
        endpoint: "packmgmt",
        body: {
          Action: "RemoveTag",
          Resources: resourceObjects,
          Pack: selectedPacks.join(","),
          PackType: "IaaS",
          WorkspaceId: config.workspaceId,
          DefaultAG: config.actionGroupId,
        },
      });
    } else if (dialogAction === "removeAll") {
      action.mutate({
        endpoint: "packmgmt",
        body: {
          Action: "RemoveTag",
          Resources: resourceObjects,
          Pack: "All",
          PackType: "IaaS",
        },
      });
    }
  };



  const onSelectionChange: DataGridProps["onSelectionChange"] = (_, data) => {
    setSelectedIds(data.selectedItems as Set<string>);
  };

  if (!instance) {
    return <Text>Please select an instance in the Configuration tab first.</Text>;
  }

  if (taggedQ.isLoading || assocQ.isLoading) {
    return <Spinner size="medium" label="Loading monitored machines..." />;
  }

  if (taggedQ.isError) {
    return <Text style={{ color: tokens.colorPaletteRedForeground1 }}>Error: {String(taggedQ.error)}</Text>;
  }

  const dialogTitle =
    dialogAction === "add"
      ? `Add Monitoring — ${selectedPacks.join(", ")}`
      : dialogAction === "remove"
        ? `Remove Monitoring — ${selectedPacks.join(", ")}`
        : "Remove All Monitoring";

  return (
    <div className={styles.container}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Title3>Monitored Machines</Title3>
        <Button
          appearance="subtle"
          icon={<ArrowSyncRegular style={taggedQ.isFetching || assocQ.isFetching ? { animation: "spin 1s linear infinite" } : undefined} />}
          onClick={() => { queryClient.invalidateQueries({ queryKey: ["taggedVMs"] }); queryClient.invalidateQueries({ queryKey: ["dcrAssociations"] }); }}
          disabled={taggedQ.isFetching || assocQ.isFetching}
          title="Refresh"
        />
      </div>

      {selectedIds.size > 0 && (
        <>
          <PackSelector selectedPacks={selectedPacks} onSelectionChange={setSelectedPacks} />
          <Toolbar className={styles.toolbar}>
            <Button
              appearance="primary"
              disabled={selectedPacks.length === 0}
              onClick={() => setDialogAction("add")}
            >
              Add Pack(s)
            </Button>
            <Button
              appearance="subtle"
              disabled={selectedPacks.length === 0}
              onClick={() => setDialogAction("remove")}
            >
              Remove Pack(s)
            </Button>
            <Button
              appearance="subtle"
              onClick={() => setDialogAction("removeAll")}
              style={{ color: tokens.colorPaletteRedForeground1 }}
            >
              Remove All
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
        <Text>No monitored machines found.</Text>
      )}

      <ConfirmDialog
        open={dialogAction !== null}
        title={dialogTitle}
        onConfirm={handleConfirm}
        onCancel={() => setDialogAction(null)}
        isPending={action.isPending}
        danger={dialogAction === "removeAll"}
      >
        <Text>
          This will affect <strong>{selectedRows.length}</strong> machine(s):
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
