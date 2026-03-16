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
  Spinner,
  Text,
  Title3,
  makeStyles,
  tokens,
  type DataGridProps,
} from "@fluentui/react-components";
import { useARGQuery } from "../../hooks/useARGQuery";
import { useConfig } from "../../hooks/useConfig";
import { argPackAssociations } from "../../services/queries/argQueries";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  drillDown: {
    padding: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
});

interface PackAssocRow {
  Pack: string;
  ruleName: string;
  ruleId: string;
  Associated: number;
  Machines: string[];
}

const resourceName = (id: string) => id.split("/").pop() ?? id;

const columns = [
  createTableColumn<PackAssocRow>({
    columnId: "pack",
    renderHeaderCell: () => "Pack",
    renderCell: (item) => item.Pack,
    compare: (a, b) => a.Pack.localeCompare(b.Pack),
  }),
  createTableColumn<PackAssocRow>({
    columnId: "ruleName",
    renderHeaderCell: () => "DCR Rule Name",
    renderCell: (item) => item.ruleName,
    compare: (a, b) => a.ruleName.localeCompare(b.ruleName),
  }),
  createTableColumn<PackAssocRow>({
    columnId: "associated",
    renderHeaderCell: () => "Associated Machines",
    renderCell: (item) => (
      <Badge color={item.Associated > 0 ? "success" : "warning"}>
        {item.Associated}
      </Badge>
    ),
    compare: (a, b) => a.Associated - b.Associated,
  }),
];

export function PackAssociations() {
  const styles = useStyles();
  const { config } = useConfig();
  const instance = config.instanceName;
  const [selectedId, setSelectedId] = useState<Set<string>>(new Set());

  const query = useARGQuery(
    ["packAssociations", instance],
    argPackAssociations(instance),
    { enabled: !!instance }
  );

  const rows: PackAssocRow[] = useMemo(() => {
    if (!query.data) return [];
    return (query.data as unknown as PackAssocRow[]).map((r) => ({
      ...r,
      Machines: Array.isArray(r.Machines) ? r.Machines : [],
    }));
  }, [query.data]);

  const selectedRow = rows.find((r) => selectedId.has(r.ruleId));

  const onSelectionChange: DataGridProps["onSelectionChange"] = (_, data) => {
    setSelectedId(data.selectedItems as Set<string>);
  };

  if (!instance) {
    return <Text>Please select an instance in the Configuration tab first.</Text>;
  }

  if (query.isLoading) {
    return <Spinner size="medium" label="Loading pack associations..." />;
  }

  if (query.isError) {
    return <Text style={{ color: tokens.colorPaletteRedForeground1 }}>Error: {String(query.error)}</Text>;
  }

  return (
    <div className={styles.container}>
      <Title3>IaaS Pack Associations</Title3>
      <Text size={200}>Click a row to see associated machines.</Text>

      {rows.length > 0 ? (
        <DataGrid
          items={rows}
          columns={columns}
          sortable
          selectionMode="multiselect"
          selectedItems={selectedId}
          onSelectionChange={onSelectionChange}
          getRowId={(item) => item.ruleId}
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => (
                <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<PackAssocRow>>
            {({ item, rowId }) => (
              <DataGridRow<PackAssocRow> key={rowId}>
                {({ renderCell }) => (
                  <DataGridCell>{renderCell(item)}</DataGridCell>
                )}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      ) : (
        <Text>No pack associations found.</Text>
      )}

      {selectedRow && selectedRow.Machines.length > 0 && (
        <div className={styles.drillDown}>
          <Text weight="semibold">
            Machines associated with {selectedRow.ruleName} ({selectedRow.Pack}):
          </Text>
          <ul style={{ margin: 4, paddingLeft: 20 }}>
            {selectedRow.Machines.map((m) => (
              <li key={m}>
                <Text size={200}>{resourceName(m)}</Text>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
