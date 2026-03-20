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
  Dropdown,
  Option,
  makeStyles,
  tokens,
  type DataGridProps,
} from "@fluentui/react-components";
import { useQueryClient } from "@tanstack/react-query";
import { useARGQuery } from "../../hooks/useARGQuery";
import { useBackendAction } from "../../hooks/useBackendAction";
import { useConfig } from "../../hooks/useConfig";
import { argAgentDetails } from "../../services/queries/argQueries";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Pagination } from "../../components/common/Pagination";

const useStyles = makeStyles({
  container: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  toolbar: { flexWrap: "wrap", gap: tokens.spacingHorizontalS },
  offRow: { opacity: 0.45 },
  summaryBar: { display: "flex", gap: tokens.spacingHorizontalL, flexWrap: "wrap" },
});

interface AgentRow {
  id: string;
  name: string;
  resourceGroup: string;
  OS: string;
  location: string;
  state: string;
  machineType: string;
  AMAStatus: string;
  AMAVersion: string;
  AutoUpgrade: string;
  DepAgentStatus: string;
}

const columns = [
  createTableColumn<AgentRow>({ columnId: "name", renderHeaderCell: () => "Name", renderCell: (r) => r.name }),
  createTableColumn<AgentRow>({ columnId: "OS", renderHeaderCell: () => "OS", renderCell: (r) => r.OS }),
  createTableColumn<AgentRow>({ columnId: "machineType", renderHeaderCell: () => "Type", renderCell: (r) => r.machineType }),
  createTableColumn<AgentRow>({ columnId: "state", renderHeaderCell: () => "State", renderCell: (r) => r.state === "On" ? <Badge appearance="filled" color="success">On</Badge> : <Badge appearance="filled" color="danger">Off</Badge> }),
  createTableColumn<AgentRow>({
    columnId: "AMAStatus",
    renderHeaderCell: () => "AMA Status",
    renderCell: (r) => r.AMAStatus === "Not Installed"
      ? <Badge appearance="tint" color="warning">Not Installed</Badge>
      : r.AMAStatus === "Succeeded"
        ? <Badge appearance="tint" color="success">{r.AMAStatus}</Badge>
        : <Text>{r.AMAStatus}</Text>,
  }),
  createTableColumn<AgentRow>({ columnId: "AMAVersion", renderHeaderCell: () => "AMA Version", renderCell: (r) => r.AMAVersion || "—" }),
  createTableColumn<AgentRow>({
    columnId: "AutoUpgrade",
    renderHeaderCell: () => "Auto Upgrade",
    renderCell: (r) => r.AutoUpgrade === "true" ? <Badge appearance="tint" color="success">Yes</Badge> : r.AutoUpgrade ? <Badge appearance="tint" color="warning">No</Badge> : "—",
  }),
  createTableColumn<AgentRow>({
    columnId: "DepAgentStatus",
    renderHeaderCell: () => "Dep. Agent",
    renderCell: (r) => r.DepAgentStatus === "Not Installed"
      ? <Badge appearance="tint" color="warning">N/A</Badge>
      : <Badge appearance="tint" color="success">{r.DepAgentStatus}</Badge>,
  }),
  createTableColumn<AgentRow>({ columnId: "resourceGroup", renderHeaderCell: () => "Resource Group", renderCell: (r) => r.resourceGroup }),
  createTableColumn<AgentRow>({ columnId: "location", renderHeaderCell: () => "Location", renderCell: (r) => r.location }),
];

export function AgentsList() {
  const s = useStyles();
  const { config } = useConfig();
  const qc = useQueryClient();
  const { data, isLoading, error } = useARGQuery("agents-details", argAgentDetails(config.instanceName));
  const action = useBackendAction();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<"AddAgent" | "RemoveAgent" | null>(null);
  const [osFilter, setOsFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const rows: AgentRow[] = useMemo(() => {
    if (!data) return [];
    return (data as Record<string, unknown>[]).map((r) => ({
      id: String(r.id ?? ""),
      name: String(r.name ?? ""),
      resourceGroup: String(r.resourceGroup ?? ""),
      OS: String(r.OS ?? ""),
      location: String(r.location ?? ""),
      state: String(r.state ?? ""),
      machineType: String(r.machineType ?? ""),
      AMAStatus: String(r.AMAStatus ?? ""),
      AMAVersion: String(r.AMAVersion ?? ""),
      AutoUpgrade: String(r.AutoUpgrade ?? ""),
      DepAgentStatus: String(r.DepAgentStatus ?? ""),
    }));
  }, [data]);

  const filtered = useMemo(() => {
    let result = rows;
    if (osFilter.length) result = result.filter((r) => osFilter.includes(r.OS));
    if (statusFilter.length) result = result.filter((r) => statusFilter.includes(r.AMAStatus));
    return result;
  }, [rows, osFilter, statusFilter]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Summaries
  const summary = useMemo(() => {
    const installed = rows.filter((r) => r.AMAStatus !== "Not Installed").length;
    const notInstalled = rows.filter((r) => r.AMAStatus === "Not Installed").length;
    const depInstalled = rows.filter((r) => r.DepAgentStatus !== "Not Installed").length;
    return { installed, notInstalled, depInstalled, total: rows.length };
  }, [rows]);

  const osOptions = useMemo(() => [...new Set(rows.map((r) => r.OS))].filter(Boolean).sort(), [rows]);
  const statusOptions = useMemo(() => [...new Set(rows.map((r) => r.AMAStatus))].sort(), [rows]);

  const onSelectionChange: DataGridProps["onSelectionChange"] = (_e, d) => setSelected(d.selectedItems as Set<string>);

  const selectedResources = useMemo(
    () => rows.filter((r) => selected.has(r.id)).map((r) => ({ id: r.id, OSType: r.OS, location: r.location })),
    [rows, selected],
  );

  const executeAction = (act: "AddAgent" | "RemoveAgent") => {
    action.mutate(
      { endpoint: "agentMgmt", body: { Action: act, Resources: selectedResources } },
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

  if (isLoading) return <Spinner label="Loading agent data…" />;
  if (error) return <Text>Error loading agents.</Text>;

  return (
    <div className={s.container}>
      <Title3>Agent Management</Title3>

      <div className={s.summaryBar}>
        <Badge appearance="filled" color="informative">Total: {summary.total}</Badge>
        <Badge appearance="filled" color="success">AMA Installed: {summary.installed}</Badge>
        <Badge appearance="filled" color="warning">AMA Not Installed: {summary.notInstalled}</Badge>
        <Badge appearance="filled" color="brand">Dep. Agent: {summary.depInstalled}</Badge>
      </div>

      <Toolbar className={s.toolbar}>
        <Dropdown
          placeholder="Filter OS"
          multiselect
          selectedOptions={osFilter}
          onOptionSelect={(_e, d) => { setOsFilter(d.selectedOptions); setPage(0); }}
          style={{ minWidth: 140 }}
        >
          {osOptions.map((o) => <Option key={o} value={o}>{o}</Option>)}
        </Dropdown>
        <Dropdown
          placeholder="Filter AMA Status"
          multiselect
          selectedOptions={statusFilter}
          onOptionSelect={(_e, d) => { setStatusFilter(d.selectedOptions); setPage(0); }}
          style={{ minWidth: 180 }}
        >
          {statusOptions.map((o) => <Option key={o} value={o}>{o}</Option>)}
        </Dropdown>
        <Button
          appearance="primary"
          disabled={selected.size === 0 || action.isPending}
          onClick={() => setConfirmAction("AddAgent")}
        >
          Install AMA
        </Button>
        <Button
          appearance="secondary"
          disabled={selected.size === 0 || action.isPending}
          onClick={() => setConfirmAction("RemoveAgent")}
        >
          Remove AMA
        </Button>
        {action.isPending && <Spinner size="tiny" />}
      </Toolbar>

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
        <DataGridBody<AgentRow>>
          {({ item, rowId }) => (
            <DataGridRow<AgentRow> key={rowId} className={item.state === "Off" ? s.offRow : undefined}>
              {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>

      <Pagination
        totalItems={filtered.length}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
      />

      <ConfirmDialog
        open={confirmAction !== null}
        title={`${confirmAction === "AddAgent" ? "Install" : "Remove"} Azure Monitor Agent`}
        message={`This will ${confirmAction === "AddAgent" ? "install AMA on" : "remove AMA from"} ${selected.size} selected machine(s). Continue?`}
        onConfirm={() => confirmAction && executeAction(confirmAction)}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
