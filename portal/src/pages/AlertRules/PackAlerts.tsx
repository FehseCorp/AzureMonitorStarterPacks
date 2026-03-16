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
import { argPackAlerts } from "../../services/queries/argQueries";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Pagination } from "../../components/common/Pagination";
import { ActionGroupPicker } from "../../components/shared/ActionGroupPicker";

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
  disabledRow: {
    opacity: 0.55,
  },
});

interface AlertRow {
  id: string;
  name: string;
  type: string;
  Pack: string;
  Enabled: string;
  Severity: string;
  Description: string;
  resourceGroup: string;
  subscriptionId: string;
}

const alertTypeName = (type: string) => {
  const lower = type.toLowerCase();
  if (lower.includes("scheduledqueryrules")) return "Scheduled Query";
  if (lower.includes("metricalerts")) return "Metric";
  if (lower.includes("activitylogalerts")) return "Activity Log";
  return type;
};

const severityBadge = (severity: string) => {
  switch (severity) {
    case "0": return <Badge color="danger">Sev 0</Badge>;
    case "1": return <Badge color="important">Sev 1</Badge>;
    case "2": return <Badge color="warning">Sev 2</Badge>;
    case "3": return <Badge color="informative">Sev 3</Badge>;
    case "4": return <Badge color="subtle">Sev 4</Badge>;
    default: return <Badge>{severity || "—"}</Badge>;
  }
};

const columns = [
  createTableColumn<AlertRow>({
    columnId: "name",
    renderHeaderCell: () => "Name",
    renderCell: (item) => item.name,
    compare: (a, b) => a.name.localeCompare(b.name),
  }),
  createTableColumn<AlertRow>({
    columnId: "pack",
    renderHeaderCell: () => "Pack",
    renderCell: (item) => item.Pack,
    compare: (a, b) => a.Pack.localeCompare(b.Pack),
  }),
  createTableColumn<AlertRow>({
    columnId: "type",
    renderHeaderCell: () => "Type",
    renderCell: (item) => alertTypeName(item.type),
    compare: (a, b) => alertTypeName(a.type).localeCompare(alertTypeName(b.type)),
  }),
  createTableColumn<AlertRow>({
    columnId: "severity",
    renderHeaderCell: () => "Severity",
    renderCell: (item) => severityBadge(item.Severity),
    compare: (a, b) => (a.Severity ?? "").localeCompare(b.Severity ?? ""),
  }),
  createTableColumn<AlertRow>({
    columnId: "enabled",
    renderHeaderCell: () => "Enabled",
    renderCell: (item) => {
      const enabled = item.Enabled?.toLowerCase() === "true";
      return <Badge color={enabled ? "success" : "warning"}>{enabled ? "Yes" : "No"}</Badge>;
    },
  }),
  createTableColumn<AlertRow>({
    columnId: "resourceGroup",
    renderHeaderCell: () => "Resource Group",
    renderCell: (item) => item.resourceGroup,
  }),
];

type DialogAction = "enable" | "disable" | "delete" | "updateAG" | null;

export function PackAlerts() {
  const styles = useStyles();
  const { config } = useConfig();
  const queryClient = useQueryClient();
  const instance = config.instanceName;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogAction, setDialogAction] = useState<DialogAction>(null);
  const [packFilter, setPackFilter] = useState<string>("__all__");
  const [showAGPicker, setShowAGPicker] = useState(false);
  const [pendingActionGroup, setPendingActionGroup] = useState<{ id: string; name: string } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const alertsQ = useARGQuery(
    ["packAlerts", instance],
    argPackAlerts(instance),
    { enabled: !!instance }
  );

  const allRows = useMemo(() => {
    return (alertsQ.data ?? []) as unknown as AlertRow[];
  }, [alertsQ.data]);

  // Derive pack filter options from data
  const packOptions = useMemo(() => {
    const packs = new Set<string>();
    for (const r of allRows) {
      if (r.Pack) packs.add(r.Pack);
    }
    return Array.from(packs).sort();
  }, [allRows]);

  // Filter by selected pack
  const filteredRows = useMemo(() => {
    if (packFilter === "__all__") return allRows;
    return allRows.filter((r) => r.Pack === packFilter);
  }, [allRows, packFilter]);

  // Paginate
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const action = useBackendAction({
    onSuccess: () => {
      setDialogAction(null);
      setSelectedIds(new Set());
      setPendingActionGroup(null);
      queryClient.invalidateQueries({ queryKey: ["packAlerts"] });
    },
  });

  const selectedRows = allRows.filter((r) => selectedIds.has(r.id));

  const handleConfirm = () => {
    const alerts = selectedRows.map((r) => ({ id: r.id }));

    if (dialogAction === "enable") {
      action.mutate({ endpoint: "alertConfigMgmt", body: { Action: "Enable", alerts } });
    } else if (dialogAction === "disable") {
      action.mutate({ endpoint: "alertConfigMgmt", body: { Action: "Disable", alerts } });
    } else if (dialogAction === "delete") {
      action.mutate({ endpoint: "alertConfigMgmt", body: { Action: "Delete", alerts } });
    } else if (dialogAction === "updateAG" && pendingActionGroup) {
      action.mutate({
        endpoint: "alertConfigMgmt",
        body: { Action: "Update", alerts, aGroup: { id: pendingActionGroup.id } },
      });
    }
  };

  const handleUpdateAGClick = () => {
    setShowAGPicker(true);
  };

  const handleAGSelected = (ag: { id: string; name: string }) => {
    setShowAGPicker(false);
    setPendingActionGroup(ag);
    setDialogAction("updateAG");
  };

  const onSelectionChange: DataGridProps["onSelectionChange"] = (_, data) => {
    setSelectedIds(data.selectedItems as Set<string>);
  };

  if (!instance) {
    return <Text>Please select an instance in the Configuration tab first.</Text>;
  }

  if (alertsQ.isLoading) {
    return <Spinner size="medium" label="Loading pack alerts..." />;
  }

  if (alertsQ.isError) {
    return <Text style={{ color: tokens.colorPaletteRedForeground1 }}>Error: {String(alertsQ.error)}</Text>;
  }

  const dialogTitle =
    dialogAction === "enable" ? "Enable Alert Rules"
    : dialogAction === "disable" ? "Disable Alert Rules"
    : dialogAction === "delete" ? "Delete Alert Rules"
    : dialogAction === "updateAG" ? "Update Action Group"
    : "";

  const dialogMessage =
    dialogAction === "enable" ? `Enable ${selectedRows.length} alert rule(s)?`
    : dialogAction === "disable" ? `Disable ${selectedRows.length} alert rule(s)?`
    : dialogAction === "delete" ? `Permanently delete ${selectedRows.length} alert rule(s)? This cannot be undone.`
    : dialogAction === "updateAG" && pendingActionGroup
      ? `Update action group to "${pendingActionGroup.name}" for ${selectedRows.length} alert rule(s)?`
    : "";

  return (
    <div className={styles.container}>
      <Title3>Pack Alert Rules</Title3>

      <Dropdown
        placeholder="Filter by Pack"
        value={packFilter === "__all__" ? "All Packs" : packFilter}
        selectedOptions={[packFilter]}
        onOptionSelect={(_, data) => {
          setPackFilter(data.optionValue ?? "__all__");
          setPage(1);
        }}
        style={{ maxWidth: 250 }}
      >
        <Option value="__all__">All Packs</Option>
        {packOptions.map((p) => (
          <Option key={p} value={p}>{p}</Option>
        ))}
      </Dropdown>

      {selectedIds.size > 0 && (
        <Toolbar className={styles.toolbar}>
          <Button appearance="primary" onClick={() => setDialogAction("enable")}>
            Enable
          </Button>
          <Button appearance="subtle" onClick={() => setDialogAction("disable")}>
            Disable
          </Button>
          <Button appearance="subtle" onClick={handleUpdateAGClick}>
            Update Action Group
          </Button>
          <Button
            appearance="subtle"
            onClick={() => setDialogAction("delete")}
            style={{ color: tokens.colorPaletteRedForeground1 }}
          >
            Delete
          </Button>
        </Toolbar>
      )}

      {pagedRows.length > 0 ? (
        <>
          <DataGrid
            items={pagedRows}
            columns={columns}
            sortable
            selectionMode="multiselect"
            selectedItems={selectedIds}
            onSelectionChange={onSelectionChange}
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
                <DataGridRow<AlertRow>
                  key={rowId}
                  className={item.Enabled?.toLowerCase() !== "true" ? styles.disabledRow : undefined}
                >
                  {({ renderCell }) => (
                    <DataGridCell>{renderCell(item)}</DataGridCell>
                  )}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
          <Pagination
            totalItems={filteredRows.length}
            pageSize={pageSize}
            currentPage={page}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      ) : (
        <Text>No pack alert rules found.</Text>
      )}

      <ConfirmDialog
        open={dialogAction !== null}
        title={dialogTitle}
        confirmLabel={dialogAction === "delete" ? "Delete" : "Confirm"}
        onConfirm={handleConfirm}
        onCancel={() => { setDialogAction(null); setPendingActionGroup(null); }}
        isPending={action.isPending}
        danger={dialogAction === "delete"}
      >
        {dialogMessage}
      </ConfirmDialog>

      <ActionGroupPicker
        open={showAGPicker}
        onSelect={handleAGSelected}
        onCancel={() => setShowAGPicker(false)}
      />
    </div>
  );
}
