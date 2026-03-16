import { useMemo, useState } from "react";
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
} from "@fluentui/react-components";
import { useConfig } from "../../hooks/useConfig";
import { useKQLQuery } from "../../hooks/useKQLQuery";
import { KQL_HEARTBEAT } from "../../services/queries/kqlQueries";
import { Pagination } from "../../components/common/Pagination";

const useStyles = makeStyles({
  container: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  healthy: { color: tokens.colorPaletteGreenForeground1 },
  stale: { color: tokens.colorPaletteRedForeground1 },
});

interface HeartbeatRow {
  Computer: string;
  OSType: string;
  LastHeartbeat: string;
  SecondsAgo: number;
  RemoteIPCountry: string;
  ResourceId: string;
}

const THRESHOLD = 600; // seconds

export function Heartbeat() {
  const s = useStyles();
  const { config } = useConfig();
  const { data, isLoading, error } = useKQLQuery(
    "heartbeat",
    config.workspaceId,
    KQL_HEARTBEAT,
    "P1D",
    { staleTime: 60_000 },
  );

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const rows: HeartbeatRow[] = useMemo(() => {
    if (!data) return [];
    return (data as Record<string, unknown>[]).map((r) => ({
      Computer: String(r.Computer ?? ""),
      OSType: String(r.OSType ?? ""),
      LastHeartbeat: String(r.LastHeartbeat ?? ""),
      SecondsAgo: Number(r.SecondsAgo ?? 0),
      RemoteIPCountry: String(r.RemoteIPCountry ?? ""),
      ResourceId: String(r.ResourceId ?? ""),
    }));
  }, [data]);

  const paged = rows.slice(page * pageSize, (page + 1) * pageSize);

  const columns = useMemo(
    () => [
      createTableColumn<HeartbeatRow>({ columnId: "Computer", renderHeaderCell: () => "Computer", renderCell: (r) => r.Computer }),
      createTableColumn<HeartbeatRow>({ columnId: "OSType", renderHeaderCell: () => "OS", renderCell: (r) => r.OSType }),
      createTableColumn<HeartbeatRow>({
        columnId: "LastHeartbeat",
        renderHeaderCell: () => "Last Heartbeat",
        renderCell: (r) => new Date(r.LastHeartbeat).toLocaleString(),
      }),
      createTableColumn<HeartbeatRow>({
        columnId: "SecondsAgo",
        renderHeaderCell: () => "Seconds Ago",
        renderCell: (r) => (
          <Badge
            appearance="filled"
            color={r.SecondsAgo <= THRESHOLD ? "success" : "danger"}
          >
            {r.SecondsAgo.toLocaleString()}s
          </Badge>
        ),
      }),
      createTableColumn<HeartbeatRow>({ columnId: "Country", renderHeaderCell: () => "Country", renderCell: (r) => r.RemoteIPCountry }),
    ],
    [],
  );

  if (isLoading) return <Spinner label="Loading heartbeat data…" />;
  if (error) return <Text>Error loading heartbeat data.</Text>;
  if (!config.workspaceId) return <Text>Configure a Log Analytics workspace in the Configuration page.</Text>;

  return (
    <div className={s.container}>
      <Title3>Agent Heartbeat</Title3>
      <Text>Green = heartbeat within {THRESHOLD}s &bull; Red = stale ({">"}
        {THRESHOLD}s)</Text>

      <DataGrid items={paged} columns={columns} getRowId={(r) => r.Computer + r.ResourceId} sortable>
        <DataGridHeader>
          <DataGridRow>{({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}</DataGridRow>
        </DataGridHeader>
        <DataGridBody<HeartbeatRow>>
          {({ item, rowId }) => (
            <DataGridRow<HeartbeatRow> key={rowId}>
              {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>

      <Pagination
        total={rows.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(sz) => { setPageSize(sz); setPage(0); }}
      />
    </div>
  );
}
