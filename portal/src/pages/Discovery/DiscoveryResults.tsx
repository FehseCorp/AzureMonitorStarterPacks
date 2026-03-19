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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { managementScope } from "../../auth/msalConfig";
import { useConfig } from "../../hooks/useConfig";
import { useBackendAction } from "../../hooks/useBackendAction";
import { callFunction } from "../../services/functionClient";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Pagination } from "../../components/common/Pagination";

const useStyles = makeStyles({
  container: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  toolbar: { flexWrap: "wrap", gap: tokens.spacingHorizontalS },
});

interface DiscoveryRow {
  Tag: string;
  ResourceId: string;
  OS: string;
  Location: string;
  TimeGenerated: string;
}

const columns = [
  createTableColumn<DiscoveryRow>({ columnId: "Tag", renderHeaderCell: () => "Pack Tag", renderCell: (r) => <Badge appearance="tint" color="brand">{r.Tag}</Badge> }),
  createTableColumn<DiscoveryRow>({
    columnId: "ResourceId",
    renderHeaderCell: () => "Resource",
    renderCell: (r) => r.ResourceId.split("/").pop() ?? r.ResourceId,
  }),
  createTableColumn<DiscoveryRow>({ columnId: "OS", renderHeaderCell: () => "OS", renderCell: (r) => r.OS }),
  createTableColumn<DiscoveryRow>({ columnId: "Location", renderHeaderCell: () => "Location", renderCell: (r) => r.Location }),
  createTableColumn<DiscoveryRow>({
    columnId: "TimeGenerated",
    renderHeaderCell: () => "Discovered At",
    renderCell: (r) => r.TimeGenerated ? new Date(r.TimeGenerated).toLocaleString() : "—",
  }),
];

export function DiscoveryResults() {
  const s = useStyles();
  const { config } = useConfig();
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const qc = useQueryClient();
  const action = useBackendAction();

  const { data, isLoading, error } = useQuery({
    queryKey: ["discovery-results"],
    queryFn: async () => {
      if (!account) throw new Error("Not authenticated");
      const tokenResponse = await instance.acquireTokenSilent({ ...managementScope, account });
      const result = await callFunction(config.functionAppUrl, tokenResponse.accessToken, "config", undefined, { Action: "getdiscoveryresults" });
      // Response shape: { Discovered: [...] } or raw array
      if (result && typeof result === "object" && "Discovered" in (result as Record<string, unknown>)) {
        const disc = (result as Record<string, unknown>).Discovered;
        if (typeof disc === "string") {
          try { return JSON.parse(disc) as DiscoveryRow[]; } catch { return []; }
        }
        return (Array.isArray(disc) ? disc : []) as DiscoveryRow[];
      }
      if (Array.isArray(result)) return result as DiscoveryRow[];
      return [];
    },
    enabled: !!account && !!config.functionAppUrl,
    staleTime: 60_000,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const rows: DiscoveryRow[] = useMemo(() => data ?? [], [data]);
  const paged = rows.slice(page * pageSize, (page + 1) * pageSize);

  const onSelectionChange: DataGridProps["onSelectionChange"] = (_e, d) => setSelected(d.selectedItems as Set<string>);

  const selectedResources = useMemo(
    () => rows.filter((r) => selected.has(r.ResourceId)).map((r) => ({
      Resource: { Resource: r.ResourceId, OS: r.OS, Location: r.Location },
      Tag: r.Tag,
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
            getRowId={(r) => r.ResourceId}
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

          <Pagination total={rows.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(sz) => { setPageSize(sz); setPage(0); }} />
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
