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
  Tab,
  TabList,
  makeStyles,
  tokens,
  type SelectTabData,
} from "@fluentui/react-components";
import { useBackendAction } from "../../hooks/useBackendAction";
import { useQuery } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { managementScope } from "../../auth/msalConfig";
import { callFunction, getFunctionKey } from "../../services/functionClient";
import { useConfig } from "../../hooks/useConfig";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
});

// ── IaaS Pack Details ──

interface IaaSPackRow {
  Name: string;
  Tag: string;
  NumberOfRules: number;
  NumberOfAlerts: number;
  AlertNames: string;
}

const iaaSColumns = [
  createTableColumn<IaaSPackRow>({
    columnId: "name",
    renderHeaderCell: () => "Name",
    renderCell: (item) => item.Name,
    compare: (a, b) => a.Name.localeCompare(b.Name),
  }),
  createTableColumn<IaaSPackRow>({
    columnId: "tag",
    renderHeaderCell: () => "Tag",
    renderCell: (item) => item.Tag,
    compare: (a, b) => a.Tag.localeCompare(b.Tag),
  }),
  createTableColumn<IaaSPackRow>({
    columnId: "rules",
    renderHeaderCell: () => "Rules",
    renderCell: (item) => item.NumberOfRules ?? 0,
    compare: (a, b) => (a.NumberOfRules ?? 0) - (b.NumberOfRules ?? 0),
  }),
  createTableColumn<IaaSPackRow>({
    columnId: "alerts",
    renderHeaderCell: () => "Alerts",
    renderCell: (item) => item.NumberOfAlerts ?? 0,
    compare: (a, b) => (a.NumberOfAlerts ?? 0) - (b.NumberOfAlerts ?? 0),
  }),
  createTableColumn<IaaSPackRow>({
    columnId: "alertNames",
    renderHeaderCell: () => "Alert Names",
    renderCell: (item) => item.AlertNames ?? "—",
  }),
];

// ── Services Pack Details ──

interface ServicePackRow {
  category: string;
  service: string;
  namespace: string;
  metricnamespace: string;
  tag: string;
  NumberOfMetrics: number;
}

const serviceColumns = [
  createTableColumn<ServicePackRow>({
    columnId: "category",
    renderHeaderCell: () => "Category",
    renderCell: (item) => item.category,
    compare: (a, b) => a.category.localeCompare(b.category),
  }),
  createTableColumn<ServicePackRow>({
    columnId: "service",
    renderHeaderCell: () => "Service",
    renderCell: (item) => item.service,
    compare: (a, b) => a.service.localeCompare(b.service),
  }),
  createTableColumn<ServicePackRow>({
    columnId: "namespace",
    renderHeaderCell: () => "Namespace",
    renderCell: (item) => item.namespace,
  }),
  createTableColumn<ServicePackRow>({
    columnId: "tag",
    renderHeaderCell: () => "Tag",
    renderCell: (item) => item.tag,
  }),
  createTableColumn<ServicePackRow>({
    columnId: "metrics",
    renderHeaderCell: () => "Metrics",
    renderCell: (item) => item.NumberOfMetrics ?? 0,
    compare: (a, b) => (a.NumberOfMetrics ?? 0) - (b.NumberOfMetrics ?? 0),
  }),
];

function useConfigQuery<T>(action: string, queryKey: string) {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const { config } = useConfig();

  return useQuery<T>({
    queryKey: [queryKey],
    queryFn: async () => {
      if (!account) throw new Error("Not authenticated");
      if (!config.functionAppUrl) throw new Error("Function App URL not configured");

      const tokenResponse = await instance.acquireTokenSilent({
        ...managementScope,
        account,
      });

      let functionKey: string | undefined;
      if (config.functionAppId) {
        functionKey = await getFunctionKey(
          config.functionAppId,
          tokenResponse.accessToken
        );
      }

      const result = await callFunction(
        config.functionAppUrl,
        tokenResponse.accessToken,
        "config",
        undefined,
        { Action: action },
        functionKey
      );
      return result as T;
    },
    enabled: !!account && !!config.functionAppUrl,
  });
}

type DetailTab = "iaas" | "services";

export function PackDetails() {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<DetailTab>("iaas");

  const iaaSQ = useConfigQuery<IaaSPackRow[] | string>("getIaaSPacksDetails", "iaasPackDetails");
  const servicesQ = useConfigQuery<{ Categories?: ServicePackRow[] } | string>(
    "getServicesPacksDetails",
    "servicesPackDetails"
  );

  const iaaSRows: IaaSPackRow[] = useMemo(() => {
    if (!iaaSQ.data) return [];
    // Backend may return JSON string or parsed array
    if (typeof iaaSQ.data === "string") {
      try {
        const parsed = JSON.parse(iaaSQ.data);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(iaaSQ.data) ? iaaSQ.data : [];
  }, [iaaSQ.data]);

  const serviceRows: ServicePackRow[] = useMemo(() => {
    if (!servicesQ.data) return [];
    if (typeof servicesQ.data === "string") {
      try {
        const parsed = JSON.parse(servicesQ.data);
        return parsed?.Categories ?? (Array.isArray(parsed) ? parsed : []);
      } catch {
        return [];
      }
    }
    const data = servicesQ.data as { Categories?: ServicePackRow[] };
    return data?.Categories ?? [];
  }, [servicesQ.data]);

  const isLoading = iaaSQ.isLoading || servicesQ.isLoading;

  return (
    <div className={styles.container}>
      <Title3>Pack Details</Title3>
      <TabList
        selectedValue={selectedTab}
        onTabSelect={(_, data: SelectTabData) => setSelectedTab(data.value as DetailTab)}
      >
        <Tab value="iaas">IaaS Packs</Tab>
        <Tab value="services">Services Packs</Tab>
      </TabList>

      {isLoading && <Spinner size="medium" label="Loading pack details..." />}

      {selectedTab === "iaas" && !iaaSQ.isLoading && (
        <>
          {iaaSQ.isError && (
            <Text style={{ color: tokens.colorPaletteRedForeground1 }}>
              Error: {String(iaaSQ.error)}
            </Text>
          )}
          {iaaSRows.length > 0 ? (
            <DataGrid
              items={iaaSRows}
              columns={iaaSColumns}
              sortable
              getRowId={(item) => item.Tag}
            >
              <DataGridHeader>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<IaaSPackRow>>
                {({ item, rowId }) => (
                  <DataGridRow<IaaSPackRow> key={rowId}>
                    {({ renderCell }) => (
                      <DataGridCell>{renderCell(item)}</DataGridCell>
                    )}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>
          ) : (
            !iaaSQ.isError && <Text>No IaaS pack details found.</Text>
          )}
        </>
      )}

      {selectedTab === "services" && !servicesQ.isLoading && (
        <>
          {servicesQ.isError && (
            <Text style={{ color: tokens.colorPaletteRedForeground1 }}>
              Error: {String(servicesQ.error)}
            </Text>
          )}
          {serviceRows.length > 0 ? (
            <DataGrid
              items={serviceRows}
              columns={serviceColumns}
              sortable
              getRowId={(item) => item.namespace}
            >
              <DataGridHeader>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<ServicePackRow>>
                {({ item, rowId }) => (
                  <DataGridRow<ServicePackRow> key={rowId}>
                    {({ renderCell }) => (
                      <DataGridCell>{renderCell(item)}</DataGridCell>
                    )}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>
          ) : (
            !servicesQ.isError && <Text>No services pack details found.</Text>
          )}
        </>
      )}
    </div>
  );
}
