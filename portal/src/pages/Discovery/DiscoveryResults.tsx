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
import { useQueryClient } from "@tanstack/react-query";
import { useConfig } from "../../hooks/useConfig";
import { useKQLQuery } from "../../hooks/useKQLQuery";
import { KQL_DISCOVERY_RESULTS } from "../../services/queries/kqlQueries";
import { useBackendAction } from "../../hooks/useBackendAction";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Pagination } from "../../components/common/Pagination";

const useStyles = makeStyles({
  container: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  toolbar: { flexWrap: "wrap", gap: tokens.spacingHorizontalS },
});

interface DiscoveryRow {
  Pack: string;
  Resource: string;
  OS: string;
  Location: string;
  "Discovery Time": string;
}

const columns = [
  createTableColumn<DiscoveryRow>({ columnId: "Pack", renderHeaderCell: () => "Pack Tag", renderCell: (r) => <Badge appearance="tint" color="brand">{r.Pack}</Badge> }),
  createTableColumn<DiscoveryRow>({
    columnId: "Resource",
    renderHeaderCell: () => "Resource",
    renderCell: (r) => r.Resource.split("/").pop() ?? r.Resource,
  }),
  createTableColumn<DiscoveryRow>({ columnId: "OS", renderHeaderCell: () => "OS", renderCell: (r) => r.OS }),
  createTableColumn<DiscoveryRow>({ columnId: "Location", renderHeaderCell: () => "Location", renderCell: (r) => r.Location }),
  createTableColumn<DiscoveryRow>({
    columnId: "DiscoveryTime",
    renderHeaderCell: () => "Discovered At",
    renderCell: (r) => r["Discovery Time"] ? new Date(r["Discovery Time"]).toLocaleString() : "—",
  }),
];

export function DiscoveryResults() {
  const s = useStyles();
  const { config } = useConfig();
  const qc = useQueryClient();
  const action = useBackendAction();

  const { data, isLoading, error } = useKQLQuery(
    "discovery-results",
    config.workspaceId,
    KQL_DISCOVERY_RESULTS,
    "P1D",
    { staleTime: 60_000 },
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const rows: DiscoveryRow[] = useMemo(() => (data ?? []) as DiscoveryRow[], [data]);
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);

  const onSelectionChange: DataGridProps["onSelectionChange"] = (_e, d) => setSelected(d.selectedItems as Set<string>);

  const selectedResources = useMemo(
    () => rows.filter((r) => selected.has(r.Resource)).map((r) => ({
      Resource: { Resource: r.Resource, OS: r.OS, Location: r.Location },
      Tag: r.Pack,
    })),
    [rows, selected],
  );

  const handleRunDiscovery = () => {
    action.mutate(
      { endpoint: "config", body: undefined, queryParams: { Action: "runDiscovery" } },
      {
        onSuccess: () => qc.invalidateQueries({ queryKey: ["discovery-results"] }),
      },
    );
  };

  if (isLoading) return <Spinner label="Loading discovery results…" />;
  if (error) return <Text>Error loading discovery results.</Text>;

  return (
    <div className={s.container}>
      <Title3>Discovery Results</Title3>

      <Toolbar className={s.toolbar}>
        <Button appearance="primary" onClick={handleRunDiscovery} disabled={action.isPending}>
          Run Discovery
        </Button>
        {action.isPending && <Spinner size="tiny" />}
        <Text>Found {rows.length} discovered resource(s)</Text>
      </Toolbar>

      {rows.length === 0 ? (
        <Text>No discovery results available. Run discovery to scan for applications.</Text>
      ) : (
        <>
          <DataGrid
            items={paged}
            columns={columns}
            getRowId={(r) => r.Resource}
            selectionMode="multiselect"
            selectedItems={selected}
            onSelectionChange={onSelectionChange}
            sortable
          >
            <DataGridHeader>
              <DataGridRow>{({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}</DataGridRow>
            </DataGridHeader>
            <DataGridBody<DiscoveryRow>>
              {({ item, rowId }) => (
                <DataGridRow<DiscoveryRow> key={rowId}>
                  {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>

          <Pagination totalItems={rows.length} currentPage={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }} />
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Enable Monitoring"
        message={`Enable monitoring for ${selected.size} selected resource(s)?`}
        onConfirm={() => { setConfirmOpen(false); setSelected(new Set()); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
