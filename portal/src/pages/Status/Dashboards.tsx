import {
  DataGrid,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridBody,
  DataGridRow,
  DataGridCell,
  createTableColumn,
  Link,
  Spinner,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useARGQuery } from "../../hooks/useARGQuery";
import { ARG_DASHBOARDS } from "../../services/queries/argQueries";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
});

interface DashboardRow {
  Link: string;
  Name: string;
  type: string;
}

const columns = [
  createTableColumn<DashboardRow>({
    columnId: "Name",
    renderHeaderCell: () => "Name",
    renderCell: (item) => {
      const portalUrl = `https://portal.azure.com/#@/resource${item.Link}`;
      return (
        <Link href={portalUrl} target="_blank">
          {String(item.Name)}
        </Link>
      );
    },
    compare: (a, b) => String(a.Name).localeCompare(String(b.Name)),
  }),
  createTableColumn<DashboardRow>({
    columnId: "type",
    renderHeaderCell: () => "Type",
    renderCell: (item) => item.type,
    compare: (a, b) => a.type.localeCompare(b.type),
  }),
];

export function Dashboards() {
  const styles = useStyles();

  const dashQ = useARGQuery(
    ["dashboards"],
    ARG_DASHBOARDS,
    { enabled: true }
  );

  const dashboards = (dashQ.data ?? []) as unknown as DashboardRow[];

  if (dashQ.isLoading) {
    return <Spinner size="medium" label="Loading dashboards..." />;
  }

  if (dashQ.isError) {
    return (
      <Text style={{ color: tokens.colorPaletteRedForeground1 }}>
        Error loading dashboards: {String(dashQ.error)}
      </Text>
    );
  }

  return (
    <div className={styles.container}>
      <Text weight="semibold">
        {dashboards.length} dashboard{dashboards.length !== 1 ? "s" : ""}
      </Text>
      {dashboards.length > 0 ? (
        <DataGrid
          items={dashboards}
          columns={columns}
          sortable
          getRowId={(item) => item.Link}
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => (
                <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<DashboardRow>>
            {({ item, rowId }) => (
              <DataGridRow<DashboardRow> key={rowId}>
                {({ renderCell }) => (
                  <DataGridCell>{renderCell(item)}</DataGridCell>
                )}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      ) : (
        <Text>No dashboards found.</Text>
      )}
    </div>
  );
}
