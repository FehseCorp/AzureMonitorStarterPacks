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
  TabList,
  Tab,
  makeStyles,
  tokens,
  type DataGridProps,
} from "@fluentui/react-components";
import { useQueryClient } from "@tanstack/react-query";
import { useARGQuery } from "../../hooks/useARGQuery";
import { useBackendAction } from "../../hooks/useBackendAction";
import { useConfig } from "../../hooks/useConfig";
import { argDiscoveryTaggedVMs, argDiscoveryNonTaggedVMs } from "../../services/queries/argQueries";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Pagination } from "../../components/common/Pagination";

const useStyles = makeStyles({
  container: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  toolbar: { flexWrap: "wrap", gap: tokens.spacingHorizontalS },
});

interface DiscVM {
  id: string;
  name: string;
  resourceGroup: string;
  OS: string;
  Packs?: string;
  location: string;
  subscriptionId: string;
}

type DiscTab = "tagged" | "nontagged";

export function DiscoveryConfig() {
  const s = useStyles();
  const { config } = useConfig();
  const qc = useQueryClient();
  const action = useBackendAction();

  const [tab, setTab] = useState<DiscTab>("tagged");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const taggedQ = useARGQuery("discovery-tagged", argDiscoveryTaggedVMs(config.instanceName));
  const nonTaggedQ = useARGQuery("discovery-nontagged", argDiscoveryNonTaggedVMs(config.instanceName));

  const isLoading = tab === "tagged" ? taggedQ.isLoading : nonTaggedQ.isLoading;
  const error = tab === "tagged" ? taggedQ.error : nonTaggedQ.error;
  const rawData = tab === "tagged" ? taggedQ.data : nonTaggedQ.data;

  const rows: DiscVM[] = useMemo(() => {
    if (!rawData) return [];
    return (rawData as Record<string, unknown>[]).map((r) => ({
      id: String(r.id ?? ""),
      name: String(r.name ?? ""),
      resourceGroup: String(r.resourceGroup ?? ""),
      OS: String(r.OS ?? ""),
      Packs: r.Packs ? String(r.Packs) : undefined,
      location: String(r.location ?? ""),
      subscriptionId: String(r.subscriptionId ?? ""),
    }));
  }, [rawData]);

  const paged = rows.slice((page - 1) * pageSize, page * pageSize);

  const taggedColumns = useMemo(() => [
    createTableColumn<DiscVM>({ columnId: "name", renderHeaderCell: () => "Name", renderCell: (r) => r.name }),
    createTableColumn<DiscVM>({ columnId: "OS", renderHeaderCell: () => "OS", renderCell: (r) => r.OS }),
    createTableColumn<DiscVM>({ columnId: "Packs", renderHeaderCell: () => "Discovery Packs", renderCell: (r) => r.Packs ?? "—" }),
    createTableColumn<DiscVM>({ columnId: "resourceGroup", renderHeaderCell: () => "Resource Group", renderCell: (r) => r.resourceGroup }),
    createTableColumn<DiscVM>({ columnId: "location", renderHeaderCell: () => "Location", renderCell: (r) => r.location }),
  ], []);

  const nonTaggedColumns = useMemo(() => [
    createTableColumn<DiscVM>({ columnId: "name", renderHeaderCell: () => "Name", renderCell: (r) => r.name }),
    createTableColumn<DiscVM>({ columnId: "OS", renderHeaderCell: () => "OS", renderCell: (r) => r.OS }),
    createTableColumn<DiscVM>({ columnId: "resourceGroup", renderHeaderCell: () => "Resource Group", renderCell: (r) => r.resourceGroup }),
    createTableColumn<DiscVM>({ columnId: "location", renderHeaderCell: () => "Location", renderCell: (r) => r.location }),
  ], []);

  const onSelectionChange: DataGridProps["onSelectionChange"] = (_e, d) => setSelected(d.selectedItems as Set<string>);

  const selectedResources = useMemo(
    () => rows.filter((r) => selected.has(r.id)).map((r) => ({
      id: r.id,
      OSType: r.OS,
      location: r.location,
    })),
    [rows, selected],
  );

  const handleEnableDiscovery = () => {
    // Enable discovery by adding WinDisc/LxDisc pack tags via packmgmt
    const resources = rows.filter((r) => selected.has(r.id)).map((r) => ({
      Resource: r.id,
      OS: r.OS,
      Location: r.location,
    }));
    const winResources = resources.filter((r) => r.OS === "Windows");
    const lxResources = resources.filter((r) => r.OS === "Linux" || r.OS === "linux");

    const promises: Promise<unknown>[] = [];
    if (winResources.length > 0) {
      promises.push(
        new Promise((resolve, reject) =>
          action.mutate(
            { endpoint: "packmgmt", body: { Action: "AddPack", Tag: "WinDisc", Resources: winResources } },
            { onSuccess: resolve, onError: reject },
          ),
        ),
      );
    }
    if (lxResources.length > 0) {
      promises.push(
        new Promise((resolve, reject) =>
          action.mutate(
            { endpoint: "packmgmt", body: { Action: "AddPack", Tag: "LxDisc", Resources: lxResources } },
            { onSuccess: resolve, onError: reject },
          ),
        ),
      );
    }
    Promise.allSettled(promises).then(() => {
      setSelected(new Set());
      setConfirmAction(null);
      qc.invalidateQueries({ queryKey: ["arg"] });
    });
  };

  const handleRemoveDiscovery = () => {
    const resources = rows.filter((r) => selected.has(r.id)).map((r) => ({
      Resource: r.id,
      OS: r.OS,
      Location: r.location,
    }));
    action.mutate(
      { endpoint: "packmgmt", body: { Action: "RemoveTag", Tag: "All", Resources: resources } },
      {
        onSuccess: () => {
          setSelected(new Set());
          setConfirmAction(null);
          qc.invalidateQueries({ queryKey: ["arg"] });
        },
        onError: () => setConfirmAction(null),
      },
    );
  };

  return (
    <div className={s.container}>
      <Title3>Discovery Configuration</Title3>

      <TabList selectedValue={tab} onTabSelect={(_e, d) => { setTab(d.value as DiscTab); setSelected(new Set()); setPage(0); }}>
        <Tab value="tagged">Discovery Tagged VMs ({taggedQ.data ? (taggedQ.data as unknown[]).length : 0})</Tab>
        <Tab value="nontagged">Non-Tagged VMs ({nonTaggedQ.data ? (nonTaggedQ.data as unknown[]).length : 0})</Tab>
      </TabList>

      <Toolbar className={s.toolbar}>
        {tab === "nontagged" && (
          <Button appearance="primary" disabled={selected.size === 0 || action.isPending} onClick={() => setConfirmAction("enable")}>
            Enable Discovery
          </Button>
        )}
        {tab === "tagged" && (
          <Button appearance="secondary" disabled={selected.size === 0 || action.isPending} onClick={() => setConfirmAction("remove")}>
            Remove Discovery
          </Button>
        )}
        {action.isPending && <Spinner size="tiny" />}
      </Toolbar>

      {isLoading ? <Spinner label="Loading…" /> : error ? <Text>Error loading data.</Text> : (
        <>
          <DataGrid
            items={paged}
            columns={tab === "tagged" ? taggedColumns : nonTaggedColumns}
            getRowId={(r) => r.id}
            selectionMode="multiselect"
            selectedItems={selected}
            onSelectionChange={onSelectionChange}
            sortable
          >
            <DataGridHeader>
              <DataGridRow>{({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}</DataGridRow>
            </DataGridHeader>
            <DataGridBody<DiscVM>>
              {({ item, rowId }) => (
                <DataGridRow<DiscVM> key={rowId}>
                  {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
          <Pagination totalItems={rows.length} currentPage={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }} />
        </>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction === "enable" ? "Enable Discovery" : "Remove Discovery"}
        message={`${confirmAction === "enable" ? "Enable discovery on" : "Remove discovery from"} ${selected.size} selected machine(s)?`}
        onConfirm={() => confirmAction === "enable" ? handleEnableDiscovery() : handleRemoveDiscovery()}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
