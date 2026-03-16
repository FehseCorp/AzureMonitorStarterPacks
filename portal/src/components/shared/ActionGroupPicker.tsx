import { useState, useMemo } from "react";
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Spinner,
  DataGrid,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridBody,
  DataGridRow,
  DataGridCell,
  createTableColumn,
  Text,
  type DataGridProps,
} from "@fluentui/react-components";
import { useARGQuery } from "../../hooks/useARGQuery";
import { ARG_ACTION_GROUPS_WITH_EMAILS } from "../../services/queries/argQueries";

interface ActionGroup {
  id: string;
  name: string;
  resourceGroup: string;
  subscriptionId: string;
  emailReceivers: { name: string; emailAddress: string }[];
}

const columns = [
  createTableColumn<ActionGroup>({
    columnId: "name",
    renderHeaderCell: () => "Name",
    renderCell: (item) => item.name,
    compare: (a, b) => a.name.localeCompare(b.name),
  }),
  createTableColumn<ActionGroup>({
    columnId: "resourceGroup",
    renderHeaderCell: () => "Resource Group",
    renderCell: (item) => item.resourceGroup,
  }),
  createTableColumn<ActionGroup>({
    columnId: "emails",
    renderHeaderCell: () => "Email Receivers",
    renderCell: (item) => {
      const emails = item.emailReceivers ?? [];
      if (emails.length === 0) return "—";
      return emails.map((e) => e.emailAddress).join(", ");
    },
  }),
];

interface ActionGroupPickerProps {
  open: boolean;
  onSelect: (actionGroup: ActionGroup) => void;
  onCancel: () => void;
}

export function ActionGroupPicker({ open, onSelect, onCancel }: ActionGroupPickerProps) {
  const [selectedId, setSelectedId] = useState<Set<string>>(new Set());

  const agQuery = useARGQuery(["actionGroupsWithEmails"], ARG_ACTION_GROUPS_WITH_EMAILS, {
    enabled: open,
  });

  const rows: ActionGroup[] = useMemo(() => {
    if (!agQuery.data) return [];
    return (agQuery.data as unknown as ActionGroup[]).map((ag) => ({
      ...ag,
      emailReceivers: Array.isArray(ag.emailReceivers) ? ag.emailReceivers : [],
    }));
  }, [agQuery.data]);

  const handleSelectionChange: DataGridProps["onSelectionChange"] = (_, data) => {
    const items = data.selectedItems as Set<string>;
    // Single-select: keep only the last selected
    if (items.size > 1) {
      const arr = Array.from(items);
      setSelectedId(new Set([arr[arr.length - 1]]));
    } else {
      setSelectedId(items);
    }
  };

  const handleConfirm = () => {
    const id = Array.from(selectedId)[0];
    const ag = rows.find((r) => r.id === id);
    if (ag) onSelect(ag);
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => { if (!d.open) onCancel(); }}>
      <DialogSurface style={{ maxWidth: 800 }}>
        <DialogTitle>Select Action Group</DialogTitle>
        <DialogBody>
          <DialogContent>
            {agQuery.isLoading && <Spinner size="small" label="Loading action groups..." />}
            {agQuery.isError && (
              <Text style={{ color: "red" }}>Error loading action groups: {String(agQuery.error)}</Text>
            )}
            {rows.length > 0 && (
              <DataGrid
                items={rows}
                columns={columns}
                sortable
                selectionMode="multiselect"
                selectedItems={selectedId}
                onSelectionChange={handleSelectionChange}
                getRowId={(item) => item.id}
              >
                <DataGridHeader>
                  <DataGridRow>
                    {({ renderHeaderCell }) => (
                      <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                    )}
                  </DataGridRow>
                </DataGridHeader>
                <DataGridBody<ActionGroup>>
                  {({ item, rowId }) => (
                    <DataGridRow<ActionGroup> key={rowId}>
                      {({ renderCell }) => (
                        <DataGridCell>{renderCell(item)}</DataGridCell>
                      )}
                    </DataGridRow>
                  )}
                </DataGridBody>
              </DataGrid>
            )}
            {!agQuery.isLoading && rows.length === 0 && (
              <Text>No enabled action groups found.</Text>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancel}>Cancel</Button>
            <Button appearance="primary" disabled={selectedId.size === 0} onClick={handleConfirm}>
              Select
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
