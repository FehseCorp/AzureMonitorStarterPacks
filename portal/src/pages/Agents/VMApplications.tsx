import { useMemo, useState } from "react";
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
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useARGQuery } from "../../hooks/useARGQuery";
import { useConfig } from "../../hooks/useConfig";
import { argVMApplications } from "../../services/queries/argQueries";
import { Pagination } from "../../components/common/Pagination";

const useStyles = makeStyles({
  container: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
});

interface VMAppRow {
  name: string;
  resourceGroup: string;
  location: string;
  appName: string;
  appVersion: string;
  gallery: string;
}

const columns = [
  createTableColumn<VMAppRow>({ columnId: "name", renderHeaderCell: () => "Computer", renderCell: (r) => r.name }),
  createTableColumn<VMAppRow>({ columnId: "appName", renderHeaderCell: () => "Application", renderCell: (r) => r.appName }),
  createTableColumn<VMAppRow>({ columnId: "appVersion", renderHeaderCell: () => "Version", renderCell: (r) => r.appVersion }),
  createTableColumn<VMAppRow>({ columnId: "gallery", renderHeaderCell: () => "Gallery", renderCell: (r) => r.gallery }),
  createTableColumn<VMAppRow>({ columnId: "resourceGroup", renderHeaderCell: () => "Resource Group", renderCell: (r) => r.resourceGroup }),
  createTableColumn<VMAppRow>({ columnId: "location", renderHeaderCell: () => "Location", renderCell: (r) => r.location }),
];

export function VMApplications() {
  const s = useStyles();
  const { config } = useConfig();
  const { data, isLoading, error } = useARGQuery("vm-applications", argVMApplications(config.instanceName));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const rows: VMAppRow[] = useMemo(() => {
    if (!data) return [];
    return (data as Record<string, unknown>[]).map((r) => ({
      name: String(r.name ?? ""),
      resourceGroup: String(r.resourceGroup ?? ""),
      location: String(r.location ?? ""),
      appName: String(r.appName ?? ""),
      appVersion: String(r.appVersion ?? ""),
      gallery: String(r.gallery ?? ""),
    }));
  }, [data]);

  const paged = rows.slice((page - 1) * pageSize, page * pageSize);

  if (isLoading) return <Spinner label="Loading VM applications…" />;
  if (error) return <Text>Error loading VM applications.</Text>;

  return (
    <div className={s.container}>
      <Title3>VM Applications</Title3>
      {rows.length === 0 ? (
        <Text>No VM applications found.</Text>
      ) : (
        <>
          <DataGrid items={paged} columns={columns} getRowId={(r) => `${r.name}-${r.appName}-${r.appVersion}`} sortable>
            <DataGridHeader>
              <DataGridRow>{({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}</DataGridRow>
            </DataGridHeader>
            <DataGridBody<VMAppRow>>
              {({ item, rowId }) => (
                <DataGridRow<VMAppRow> key={rowId}>
                  {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
          <Pagination totalItems={rows.length} currentPage={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }} />
        </>
      )}
    </div>
  );
}
