import { useState, useMemo, useEffect } from "react";
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
  ProgressBar,
  makeStyles,
  tokens,
  type DataGridProps,
} from "@fluentui/react-components";
import { ArrowSyncRegular } from "@fluentui/react-icons";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { managementScope } from "../../auth/msalConfig";
import { usePaaSJob } from "../../hooks/usePaaSJob";
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
  type: string;
  tag: string;
  resourceGroup: string;
  kind: string;
  location: string;
  subscriptionId: string;
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
    renderCell: (item) => item.type ?? "",
    compare: (a, b) => (a.type ?? "").localeCompare(b.type ?? ""),
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

export function NonMonitoredServices() {
  const styles = useStyles();
  const { config } = useConfig();
  const queryClient = useQueryClient();
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterState, setFilterState] = useState<FilterState>({});
  const [searchText, setSearchText] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Non-monitored PaaS resources from Function App config API
  const servicesQ = useQuery<PaaSRow[]>({
    queryKey: ["nonMonitoredPaaS", config.functionAppUrl],
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
        { Action: "getNonMonitoredPaaS" },
      );
      let parsed = result;
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch { /* not JSON */ }
      }
      console.log("[NonMonitoredServices] raw response type:", typeof parsed, parsed);
      if (Array.isArray(parsed)) return parsed as PaaSRow[];
      if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (Array.isArray(val)) return val as PaaSRow[];
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
    const types = [...new Set(all.map((r) => r.type).filter(Boolean))].sort();
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

  // Filter by bubble selections + free-text search
  const rows = useMemo(() => {
    let result = servicesQ.data ?? [];
    // Dimension filters
    for (const dim of filterDimensions) {
      const sel = filterState[dim.key];
      if (sel && sel.length > 0) {
        const allowed = new Set(sel.map((v) => v.toLowerCase()));
        result = result.filter((r) => {
          const val = (r as Record<string, unknown>)[dim.key];
          return typeof val === "string" && allowed.has(val.toLowerCase());
        });
      }
    }
    // Free-text search across all visible fields
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter((r) =>
        resourceName(r.Resource).toLowerCase().includes(q) ||
        (r.type ?? "").toLowerCase().includes(q) ||
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

  // Backend action — enable monitoring via async queue job
  const job = usePaaSJob(() => {
    queryClient.invalidateQueries({ queryKey: ["nonMonitoredPaaS"] });
    queryClient.invalidateQueries({ queryKey: ["monitoredPaaS"] });
  });

  // Close dialog as soon as the job is submitted (202 received) so user isn't blocked
  useEffect(() => {
    if (job.phase === "running" && dialogOpen) {
      setDialogOpen(false);
      setSelectedIds(new Set());
      job.reset();
    }
  }, [job.phase, dialogOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedResources = rows.filter((r) => selectedIds.has(r.Resource));
  const selectedResourceTypes = [...new Set(selectedResources.map((r) => r.type))];

  const handleConfirm = () => {
    job.submit({
      endpoint: "packmgmt",
      label: `Enable Monitoring — ${selectedResources.length} resource(s)`,
      body: {
        Action: "AddPack",
        Resources: selectedResources.map((r) => ({
          Resource: r.Resource,
          type: r.type,
          location: r.location,
        })),
        Pack: selectedResourceTypes.join(","),
        PackType: "PaaS",
        Type: selectedResourceTypes.join(","),
        DefaultAG: config.actionGroupId,
        WorkspaceId: config.workspaceId,
      },
    });
  };

  const onSelectionChange: DataGridProps["onSelectionChange"] = (_, data) => {
    setSelectedIds(data.selectedItems as Set<string>);
  };

  if (!config.functionAppUrl) {
    return <Text>Please configure a Function App in the Configuration tab first.</Text>;
  }

  if (servicesQ.isLoading) {
    return <Spinner size="medium" label="Loading non-monitored services..." />;
  }

  if (servicesQ.isError) {
    return (
      <Text style={{ color: tokens.colorPaletteRedForeground1 }}>
        Error: {servicesQ.error instanceof Error ? servicesQ.error.message : String(servicesQ.error)}
      </Text>
    );
  }

  return (
    <div className={styles.container}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Title3>Non-Monitored Services</Title3>
        <Button
          appearance="subtle"
          icon={<ArrowSyncRegular style={servicesQ.isFetching ? { animation: "spin 1s linear infinite" } : undefined} />}
          onClick={() => queryClient.invalidateQueries({ queryKey: ["nonMonitoredPaaS"] })}
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

      {(servicesQ.data ?? []).length === 0 && (
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          No non-monitored services found.
        </Text>
      )}

      {selectedIds.size > 0 && (
        <Toolbar className={styles.toolbar}>
          <Button
            appearance="primary"
            onClick={() => setDialogOpen(true)}
          >
            Enable Monitoring
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
      ) : rows.length === 0 && (servicesQ.data ?? []).length > 0 ? (
        <Text>No services match the current filters.</Text>
      ) : null}

      <ConfirmDialog
        open={dialogOpen}
        title="Enable Monitoring"
        onConfirm={handleConfirm}
        onCancel={() => { setDialogOpen(false); job.reset(); }}
        isPending={job.phase === "submitting" || job.phase === "running"}
        confirmDisabled={job.phase === "running"}
      >
        <Text>
          This will enable monitoring for <strong>{selectedResources.length}</strong> service(s):
        </Text>
        <ul>
          {selectedResources.slice(0, 10).map((r) => (
            <li key={r.Resource}>{resourceName(r.Resource)}</li>
          ))}
          {selectedResources.length > 10 && (
            <li>...and {selectedResources.length - 10} more</li>
          )}
        </ul>
        {(job.phase === "running" || job.phase === "completed") && job.progress.total > 0 && (
          <div style={{ marginTop: "12px" }}>
            <Text size={200}>
              {job.phase === "running" ? "Processing…" : "Done —"}{" "}
              {job.progress.completed + job.progress.failed} / {job.progress.total} resources
              {job.progress.failed > 0 && (
                <span style={{ color: tokens.colorPaletteRedForeground1 }}> ({job.progress.failed} failed)</span>
              )}
            </Text>
            <ProgressBar
              value={(job.progress.completed + job.progress.failed) / job.progress.total}
              color={job.progress.failed > 0 ? "warning" : "brand"}
              style={{ marginTop: "4px" }}
            />
          </div>
        )}
        {job.phase === "error" && (
          <Text style={{ color: tokens.colorPaletteRedForeground1, display: "block", marginTop: "8px" }}>
            Error: {job.error?.message ?? "Unknown error"}
          </Text>
        )}
      </ConfirmDialog>
    </div>
  );
}
