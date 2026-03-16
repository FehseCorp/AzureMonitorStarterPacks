import { useState, useMemo } from "react";
import {
  DataGrid,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridBody,
  DataGridRow,
  DataGridCell,
  createTableColumn,
  Spinner,
  Text,
  Title3,
  Dropdown,
  Option,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useConfig } from "../../hooks/useConfig";
import { useKQLQuery } from "../../hooks/useKQLQuery";
import { KQL_DISCOVERY_RESULTS } from "../../services/queries/kqlQueries";
import { Pagination } from "../../components/common/Pagination";

const useStyles = makeStyles({
  container: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  filters: { display: "flex", gap: tokens.spacingHorizontalM, flexWrap: "wrap", alignItems: "center" },
});

export function DiscoveryData() {
  const s = useStyles();
  const { config } = useConfig();
  const { data, isLoading, error } = useKQLQuery(
    "discovery-data",
    config.workspaceId,
    KQL_DISCOVERY_RESULTS,
    "P7D",
    { staleTime: 60_000 },
  );

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data as Record<string, unknown>[];
  }, [data]);

  // Dynamic columns from actual data
  const columnKeys = useMemo(() => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]).filter((k) => k !== "TenantId" && k !== "SourceSystem" && k !== "MG" && k !== "ManagementGroupName");
  }, [rows]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    rows.forEach((r) => { if (r.Tag_s) tags.add(String(r.Tag_s)); if (r.Tag) tags.add(String(r.Tag)); });
    return [...tags].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    if (tagFilter.length === 0) return rows;
    return rows.filter((r) => {
      const tag = String(r.Tag_s ?? r.Tag ?? "");
      return tagFilter.includes(tag);
    });
  }, [rows, tagFilter]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const columns = useMemo(
    () => columnKeys.map((key) =>
      createTableColumn<Record<string, unknown>>({
        columnId: key,
        renderHeaderCell: () => key.replace(/_s$|_d$|_CL$/g, ""),
        renderCell: (r) => {
          const val = r[key];
          if (val === null || val === undefined) return "—";
          if (typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}T/)) {
            return new Date(val).toLocaleString();
          }
          return String(val);
        },
      }),
    ),
    [columnKeys],
  );

  if (!config.workspaceId) return <Text>Configure a Log Analytics workspace in the Configuration page.</Text>;
  if (isLoading) return <Spinner label="Loading discovery data…" />;
  if (error) return <Text>Error loading discovery data.</Text>;

  return (
    <div className={s.container}>
      <Title3>Raw Discovery Data</Title3>

      <div className={s.filters}>
        {allTags.length > 0 && (
          <Dropdown
            placeholder="Filter by Tag"
            multiselect
            selectedOptions={tagFilter}
            onOptionSelect={(_e, d) => { setTagFilter(d.selectedOptions); setPage(0); }}
            style={{ minWidth: 180 }}
          >
            {allTags.map((t) => <Option key={t} value={t}>{t}</Option>)}
          </Dropdown>
        )}
        <Text>{filtered.length} record(s)</Text>
      </div>

      {filtered.length === 0 ? (
        <Text>No discovery data found.</Text>
      ) : (
        <>
          <DataGrid
            items={paged}
            columns={columns}
            getRowId={(_r, i) => String(i)}
            sortable
          >
            <DataGridHeader>
              <DataGridRow>{({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}</DataGridRow>
            </DataGridHeader>
            <DataGridBody<Record<string, unknown>>>
              {({ item, rowId }) => (
                <DataGridRow<Record<string, unknown>> key={rowId}>
                  {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
          <Pagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(sz) => { setPageSize(sz); setPage(0); }} />
        </>
      )}
    </div>
  );
}
