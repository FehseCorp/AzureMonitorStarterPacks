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
import { ArrowSyncRegular } from "@fluentui/react-icons";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { managementScope } from "../../auth/msalConfig";
import { useBackendAction } from "../../hooks/useBackendAction";
import { useConfig } from "../../hooks/useConfig";
import { callFunction } from "../../services/functionClient";
import { FilterBar, type FilterState, type FilterDimension } from "../../components/common/FilterBar";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Pagination } from "../../components/common/Pagination";

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
});

interface PaaSRow {
  Resource: string;
  Type: string;
  tag: string;
  resourceGroup: string;
  kind: string;
  location: string;
  subscriptionId: string;
  AlertCount: number;
}

const resourceName = (id: string) => id.split("/").pop() ?? id;

const columns = [
  createTableColumn<PaaSRow>({
    columnId: "name",
    renderHeaderCell: () => "Name",
    renderCell: (item) => resourceName(item.Resource),
    compare: (a, b) => resourceName(a.Resource).localeCompare(resourceName(b.Resource)),
  }),
  createTableColumn<PaaSRow>({
    columnId: "resourceGroup",
    renderHeaderCell: () => "Resource Group",
    renderCell: (item) => item.resourceGroup,
    compare: (a, b) => (a.resourceGroup ?? "").localeCompare(b.resourceGroup ?? ""),
  }),
  createTableColumn<PaaSRow>({
    columnId: "type",
    renderHeaderCell: () => "Type",
    renderCell: (item) => item.Type ?? item.tag ?? "",
    compare: (a, b) => (a.Type ?? "").localeCompare(b.Type ?? ""),
  }),
  createTableColumn<PaaSRow>({
    columnId: "alerts",
    renderHeaderCell: () => "Alert Rules",
    renderCell: (item) => {
      const count = item.AlertCount ?? 0;
      return count > 0 ? (
        <Badge appearance="filled" color="success">{count}</Badge>
      ) : (
        <Badge appearance="ghost" color="warning">0</Badge>
      );
    },
  }),
  createTableColumn<PaaSRow>({
    columnId: "kind",
    renderHeaderCell: () => "Kind",
    renderCell: (item) => item.kind ?? "",
  }),
  createTableColumn<PaaSRow>({
    columnId: "location",
    renderHeaderCell: () => "Location",
    renderCell: (item) => item.location,
    compare: (a, b) => (a.location ?? "").localeCompare(b.location ?? ""),
  }),
];

export function MonitoredServices() {
  const styles = useStyles();
  const { config } = useConfig();
  const queryClient = useQueryClient();
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const instanceName = config.instanceName;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterState, setFilterState] = useState<FilterState>({});
  const [searchText, setSearchText] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Monitored PaaS resources from Function App config API
  const servicesQ = useQuery<PaaSRow[]>({
    queryKey: ["monitoredPaaS", config.functionAppUrl],
    queryFn: async () => {
      if (!account || !config.functionAppUrl) return [];
      const tokenResponse = await instance.acquireTokenSilent({
        ...managementScope,
        account,
      });
      const result = await callFunction(
        config.functionAppUrl,
        tokenResponse.accessToken,
        "config",
        undefined,
        { Action: "getMonitoredPaaS" },
      );
      // Response shape: { "Monitored Resources": [...] } or direct array
      let parsed = result;
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch { /* not JSON */ }
      }
      console.log("[MonitoredServices] raw response type:", typeof parsed, parsed);
      if (Array.isArray(parsed)) return parsed as PaaSRow[];
      if (parsed && typeof parsed === "object") {
        // Try known wrapper keys
        const obj = parsed as Record<string, unknown>;
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (Array.isArray(val)) return val as PaaSRow[];
          // Single object (PowerShell ConvertTo-Json with 1 result)
          if (val && typeof val === "object" && !Array.isArray(val) && "Resource" in (val as Record<string, unknown>)) {
            return [val as PaaSRow];
          }
        }
      }
      return [];
    },
    enabled: !!account && !!config.functionAppUrl,
    staleTime: 60_000,
  });

  // Build filter dimensions from loaded data
  const filterDimensions: FilterDimension[] = useMemo(() => {
    const all = servicesQ.data ?? [];
    const types = [...new Set(all.map((r) => r.Type ?? r.tag).filter(Boolean))].sort();
    const locations = [...new Set(all.map((r) => r.location).filter(Boolean))].sort();
    const kinds = [...new Set(all.map((r) => r.kind).filter(Boolean))].sort();
    const rgs = [...new Set(all.map((r) => r.resourceGroup).filter(Boolean))].sort();
    return [
      { key: "type", label: "Type", values: types, defaultVisible: true },
      { key: "location", label: "Location", values: locations, defaultVisible: true },
      { key: "kind", label: "Kind", values: kinds },
      { key: "resourceGroup", label: "Resource Group", values: rgs },
    ];
  }, [servicesQ.data]);

  // Apply filters
  const rows = useMemo(() => {
    let result = servicesQ.data ?? [];
    // Dimension filters
    const dimKeyMap: Record<string, (r: PaaSRow) => string> = {
      type: (r) => r.Type ?? r.tag ?? "",
      location: (r) => r.location ?? "",
      kind: (r) => r.kind ?? "",
      resourceGroup: (r) => r.resourceGroup ?? "",
    };
    for (const dim of filterDimensions) {
      const sel = filterState[dim.key];
      if (sel && sel.length > 0) {
        const allowed = new Set(sel.map((v) => v.toLowerCase()));
        const accessor = dimKeyMap[dim.key];
        result = result.filter((r) => allowed.has(accessor(r).toLowerCase()));
      }
    }
    // Free-text search
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter((r) =>
        resourceName(r.Resource).toLowerCase().includes(q) ||
        (r.Type ?? r.tag ?? "").toLowerCase().includes(q) ||
        (r.resourceGroup ?? "").toLowerCase().includes(q) ||
        (r.kind ?? "").toLowerCase().includes(q) ||
        (r.location ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [servicesQ.data, filterDimensions, filterState, searchText]);

  // Paginate
  const pagedRows = useMemo(
    () => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [rows, currentPage, pageSize]
  );

  // Backend action — remove monitoring
  const action = useBackendAction({
    onSuccess: () => {
      setDialogOpen(false);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["monitoredPaaS"] });
    },
  });

  const selectedResources = rows.filter((r) => selectedIds.has(r.Resource));

  const handleConfirm = () => {
    action.mutate({
      endpoint: "packmgmt",
      body: {
        Action: "RemoveTag",
        Resources: selectedResources.map((r) => ({
          Resource: r.Resource,
          tag: r.tag || r.Type,
        })),
        Pack: [...new Set(selectedResources.map((r) => r.tag || r.Type))].join(","),
        PackType: "PaaS",
      },
    });
  };

  const onSelectionChange: DataGridProps["onSelectionChange"] = (_, data) => {
    setSelectedIds(data.selectedItems as Set<string>);
  };

  if (!instanceName) {
    return <Text>Please select an instance in the Configuration tab first.</Text>;
  }

  if (servicesQ.isLoading) {
    return <Spinner size="medium" label="Loading monitored services..." />;
  }

  if (servicesQ.isError) {
    return (
      <Text style={{ color: tokens.colorPaletteRedForeground1 }}>
        Error: {servicesQ.error instanceof Error ? servicesQ.error.message : String(servicesQ.error)}
      </Text>
    );
  }

  const selectedTags = [...new Set(selectedResources.map((r) => r.tag || r.Type))];

  return (
    <div className={styles.container}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Title3>Monitored Services</Title3>
        <Button
          appearance="subtle"
          icon={<ArrowSyncRegular style={servicesQ.isFetching ? { animation: "spin 1s linear infinite" } : undefined} />}
          onClick={() => queryClient.invalidateQueries({ queryKey: ["monitoredPaaS"] })}
          disabled={servicesQ.isFetching}
          title="Refresh"
        />
      </div>

      <FilterBar
        dimensions={filterDimensions}
        filterState={filterState}
        onFilterChange={(state) => {
          setFilterState(state);
          setSelectedIds(new Set());
          setCurrentPage(1);
        }}
        searchText={searchText}
        onSearchTextChange={(text) => {
          setSearchText(text);
          setSelectedIds(new Set());
          setCurrentPage(1);
        }}
      />

      {selectedIds.size > 0 && (
        <Toolbar className={styles.toolbar}>
          <Button
            appearance="subtle"
            onClick={() => setDialogOpen(true)}
            style={{ color: tokens.colorPaletteRedForeground1 }}
          >
            Remove Monitoring
          </Button>
        </Toolbar>
      )}

      {rows.length > 0 ? (
        <>
          <DataGrid
            items={pagedRows}
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
            <DataGridBody<PaaSRow>>
              {({ item, rowId }) => (
                <DataGridRow<PaaSRow> key={rowId}>
                  {({ renderCell }) => (
                    <DataGridCell>{renderCell(item)}</DataGridCell>
                  )}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
          <Pagination
            totalItems={rows.length}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </>
      ) : (
        <Text>No monitored services match the current filters.</Text>
      )}

      <ConfirmDialog
        open={dialogOpen}
        title={`Remove Monitoring — ${selectedTags.join(", ")}`}
        onConfirm={handleConfirm}
        onCancel={() => { setDialogOpen(false); action.reset(); }}
        isPending={action.isPending}
        danger
      >
        <Text>
          This will remove monitoring from <strong>{selectedResources.length}</strong> service(s):
        </Text>
        <ul>
          {selectedResources.slice(0, 10).map((r) => (
            <li key={r.Resource}>{resourceName(r.Resource)}</li>
          ))}
          {selectedResources.length > 10 && (
            <li>...and {selectedResources.length - 10} more</li>
          )}
        </ul>
        {action.isError && (
          <Text style={{ color: tokens.colorPaletteRedForeground1, display: "block", marginTop: "8px" }}>
            Error: {action.error instanceof Error ? action.error.message : String(action.error)}
          </Text>
        )}
      </ConfirmDialog>
    </div>
  );
}
