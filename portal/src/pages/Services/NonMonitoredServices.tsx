import { useState, useMemo } from "react";
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
import { callFunction, getFunctionKey } from "../../services/functionClient";
import { ServiceTypeSelector } from "../../components/shared/ServiceTypeSelector";
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
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
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
      let functionKey: string | undefined;
      if (config.functionAppId) {
        functionKey = await getFunctionKey(config.functionAppId, tokenResponse.accessToken);
      }
      const result = await callFunction(
        config.functionAppUrl,
        tokenResponse.accessToken,
        "config",
        undefined,
        { Action: "getNonMonitoredPaaS" },
        functionKey
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

  // Derive service types from loaded data (only types that actually exist unmonitored)
  const serviceTypes = useMemo(
    () => [...new Set((servicesQ.data ?? []).map((r) => r.type).filter(Boolean))].sort(),
    [servicesQ.data]
  );

  // Filter — empty selectedTypes means "All" (show everything)
  const rows = useMemo(() => {
    const all = servicesQ.data ?? [];
    if (selectedTypes.length === 0) return all;
    const typeSet = new Set(selectedTypes.map((t) => t.toLowerCase()));
    return all.filter((r) => typeSet.has((r.type ?? "").toLowerCase()));
  }, [servicesQ.data, selectedTypes]);

  // Paginate
  const pagedRows = useMemo(
    () => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [rows, currentPage, pageSize]
  );

  // Backend action — enable monitoring
  const action = useBackendAction({
    onSuccess: () => {
      setDialogOpen(false);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["nonMonitoredPaaS"] });
      queryClient.invalidateQueries({ queryKey: ["monitoredPaaS"] });
    },
  });

  const selectedResources = rows.filter((r) => selectedIds.has(r.Resource));
  const selectedResourceTypes = [...new Set(selectedResources.map((r) => r.type))];

  const handleConfirm = () => {
    action.mutate({
      endpoint: "packmgmt",
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

      <ServiceTypeSelector
        serviceTypes={serviceTypes}
        selectedTypes={selectedTypes}
        onSelectionChange={(types) => {
          setSelectedTypes(types);
          setSelectedIds(new Set());
          setCurrentPage(1);
        }}
        isLoading={servicesQ.isLoading}
        label="Select Service Type(s) to display"
      />

      {selectedTypes.length === 0 && (servicesQ.data ?? []).length === 0 && (
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
      ) : rows.length === 0 && (servicesQ.data ?? []).length > 0 && selectedTypes.length > 0 ? (
        <Text>No non-monitored services found for the selected type(s).</Text>
      ) : null}

      <ConfirmDialog
        open={dialogOpen}
        title="Enable Monitoring"
        onConfirm={handleConfirm}
        onCancel={() => { setDialogOpen(false); action.reset(); }}
        isPending={action.isPending}
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
        {action.isError && (
          <Text style={{ color: tokens.colorPaletteRedForeground1, display: "block", marginTop: "8px" }}>
            Error: {action.error instanceof Error ? action.error.message : String(action.error)}
          </Text>
        )}
      </ConfirmDialog>
    </div>
  );
}
