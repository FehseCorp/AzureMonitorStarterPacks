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
  CheckmarkCircleFilled,
  DismissCircleFilled,
} from "@fluentui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useARGQuery } from "../../hooks/useARGQuery";
import { useBackendAction } from "../../hooks/useBackendAction";
import { useConfig } from "../../hooks/useConfig";
import { argDiscoveryTaggedVMs, argDiscoveryNonTaggedVMs } from "../../services/queries/argQueries";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Pagination } from "../../components/common/Pagination";

const useStyles = makeStyles({
  container: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  toolbar: { flexWrap: "wrap", gap: tokens.spacingHorizontalS },
  stoppedRow: { opacity: 0.45 },
});

interface DiscVM {
  id: string;
  name: string;
  resourceGroup: string;
  OS: string;
  Packs?: string;
  location: string;
  subscriptionId: string;
  state: string;
  tagged: boolean;
}

const stateIcon = (state: string) =>
  state === "On" ? (
    <CheckmarkCircleFilled style={{ color: tokens.colorPaletteGreenForeground1 }} />
  ) : (
    <DismissCircleFilled style={{ color: tokens.colorPaletteRedForeground1 }} />
  );

const columns = [
  createTableColumn<DiscVM>({
    columnId: "state",
    renderHeaderCell: () => "Started",
    renderCell: (r) => stateIcon(r.state),
  }),
  createTableColumn<DiscVM>({
    columnId: "name",
    renderHeaderCell: () => "Name",
    renderCell: (r) => r.name,
    compare: (a, b) => a.name.localeCompare(b.name),
  }),
  createTableColumn<DiscVM>({
    columnId: "OS",
    renderHeaderCell: () => "OS",
    renderCell: (r) => r.OS,
  }),
  createTableColumn<DiscVM>({
    columnId: "discovery",
    renderHeaderCell: () => "Discovery",
    renderCell: (r) =>
      r.tagged ? <Badge appearance="tint" color="success">Enabled</Badge> : <Badge appearance="tint" color="warning">Disabled</Badge>,
  }),
  createTableColumn<DiscVM>({
    columnId: "Packs",
    renderHeaderCell: () => "Discovery Packs",
    renderCell: (r) => r.Packs ?? "—",
  }),
  createTableColumn<DiscVM>({
    columnId: "resourceGroup",
    renderHeaderCell: () => "Resource Group",
    renderCell: (r) => r.resourceGroup,
    compare: (a, b) => a.resourceGroup.localeCompare(b.resourceGroup),
  }),
  createTableColumn<DiscVM>({
    columnId: "location",
    renderHeaderCell: () => "Location",
    renderCell: (r) => r.location,
    compare: (a, b) => a.location.localeCompare(b.location),
  }),
];

export function DiscoveryConfig() {
  const s = useStyles();
  const { config } = useConfig();
  const qc = useQueryClient();
  const action = useBackendAction();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const taggedQ = useARGQuery("discovery-tagged", argDiscoveryTaggedVMs(config.instanceName));
  const nonTaggedQ = useARGQuery("discovery-nontagged", argDiscoveryNonTaggedVMs(config.instanceName));

  const isLoading = taggedQ.isLoading || nonTaggedQ.isLoading;
  const error = taggedQ.error || nonTaggedQ.error;

  const rows: DiscVM[] = useMemo(() => {
    const tagged = ((taggedQ.data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id ?? ""),
      name: String(r.name ?? ""),
      resourceGroup: String(r.resourceGroup ?? ""),
      OS: String(r.OS ?? ""),
      Packs: r.Packs ? String(r.Packs) : undefined,
      location: String(r.location ?? ""),
      subscriptionId: String(r.subscriptionId ?? ""),
      state: String(r.state ?? "Off"),
      tagged: true,
    }));
    const nonTagged = ((nonTaggedQ.data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id ?? ""),
      name: String(r.name ?? ""),
      resourceGroup: String(r.resourceGroup ?? ""),
      OS: String(r.OS ?? ""),
      Packs: undefined,
      location: String(r.location ?? ""),
      subscriptionId: String(r.subscriptionId ?? ""),
      state: String(r.state ?? "Off"),
      tagged: false,
    }));
    return [...tagged, ...nonTagged].sort((a, b) => a.name.localeCompare(b.name));
  }, [taggedQ.data, nonTaggedQ.data]);

  const paged = rows.slice((page - 1) * pageSize, page * pageSize);

  const onSelectionChange: DataGridProps["onSelectionChange"] = (_e, d) => setSelected(d.selectedItems as Set<string>);

  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.id)), [rows, selected]);
  const allSelectedTagged = selectedRows.length > 0 && selectedRows.every((r) => r.tagged);
  const allSelectedNonTagged = selectedRows.length > 0 && selectedRows.every((r) => !r.tagged);

  const handleEnableDiscovery = () => {
    const resources = selectedRows.map((r) => ({
      Resource: r.id,
      OS: r.OS,
      Location: r.location,
      Pack: r.OS === "Windows" ? "WinDisc" : "LxDisc",
    }));

    action.mutate(
      {
        endpoint: "packmgmt",
        body: {
          Action: "AddPack",
          PackType: "Discovery",
          Resources: resources,
          WorkspaceId: config.workspaceId,
          AzureMonitorWorkspaceId: config.azureMonitorWorkspaceId,
          DefaultAG: config.actionGroupId,
        },
      },
      {
        onSuccess: () => {
          setSelected(new Set());
          setConfirmAction(null);
          qc.invalidateQueries({ queryKey: ["arg"] });
        },
      },
    );
  };

  const handleRemoveDiscovery = () => {
    const resources = selectedRows.map((r) => ({
      Resource: r.id,
      OS: r.OS,
      Location: r.location,
      Packs: r.Packs ?? "",
    }));
    action.mutate(
      { endpoint: "packmgmt", body: { Action: "RemoveTag", Pack: "All", PackType: "Discovery", Resources: resources } },
      {
        onSuccess: () => {
          setSelected(new Set());
          setConfirmAction(null);
          qc.invalidateQueries({ queryKey: ["arg"] });
        },
        onError: () => setConfirmAction(null),
      },
    );
  };

  const taggedCount = rows.filter((r) => r.tagged).length;
  const nonTaggedCount = rows.filter((r) => !r.tagged).length;

  return (
    <div className={s.container}>
      <Title3>Discovery Configuration</Title3>
      <Text>
        {taggedCount} discovery-enabled, {nonTaggedCount} non-tagged — {rows.length} total machine(s)
      </Text>

      <Toolbar className={s.toolbar}>
        <Button
          appearance="primary"
          disabled={!allSelectedNonTagged || action.isPending}
          onClick={() => setConfirmAction("enable")}
        >
          Enable Discovery
        </Button>
        <Button
          appearance="secondary"
          disabled={!allSelectedTagged || action.isPending}
          onClick={() => setConfirmAction("remove")}
        >
          Remove Discovery
        </Button>
        {action.isPending && <Spinner size="tiny" />}
      </Toolbar>

      {isLoading ? <Spinner label="Loading…" /> : error ? <Text>Error loading data.</Text> : (
        <>
          <DataGrid
            items={paged}
            columns={columns}
            getRowId={(r) => r.id}
            selectionMode="multiselect"
            selectedItems={selected}
            onSelectionChange={onSelectionChange}
            sortable
          >
            <DataGridHeader>
              <DataGridRow>{({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}</DataGridRow>
            </DataGridHeader>
            <DataGridBody<DiscVM>>
              {({ item, rowId }) => (
                <DataGridRow<DiscVM>
                  key={rowId}
                  className={item.state !== "On" ? s.stoppedRow : undefined}
                >
                  {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
          <Pagination totalItems={rows.length} currentPage={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }} />
        </>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction === "enable" ? "Enable Discovery" : "Remove Discovery"}
        onConfirm={() => confirmAction === "enable" ? handleEnableDiscovery() : handleRemoveDiscovery()}
        onCancel={() => setConfirmAction(null)}
        isPending={action.isPending}
        danger={confirmAction === "remove"}
      >
        {`${confirmAction === "enable" ? "Enable discovery on" : "Remove discovery from"} ${selected.size} selected machine(s)?`}
      </ConfirmDialog>
    </div>
  );
}
