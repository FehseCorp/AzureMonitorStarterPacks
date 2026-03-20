import { useQuery } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { managementScope } from "../auth/msalConfig";
import { acquireToken } from "../auth/acquireToken";
import { callFunction } from "../services/functionClient";
import { useConfig } from "./useConfig";
import type { PrometheusResult } from "../services/prometheusClient";

/**
 * React Query hook that executes an instant PromQL query against an
 * Azure Monitor Workspace via the Function App proxy.
 *
 * The Prometheus data-plane API requires an audience-specific token
 * (https://prometheus.monitor.azure.com) that SPA apps cannot obtain
 * via delegated auth. The Function App uses its managed identity to
 * acquire the correct token and proxies the query.
 */
export function usePrometheusQuery(
  queryKey: string | string[],
  amwResourceId: string,
  promql: string,
  options?: { staleTime?: number; enabled?: boolean }
) {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const { config } = useConfig();

  return useQuery<PrometheusResult[]>({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    queryFn: async () => {
      if (!account) throw new Error("Not authenticated");
      if (!config.functionAppUrl) throw new Error("Function App URL not configured");

      const tokenResponse = await acquireToken(instance, account, managementScope);

      const result = await callFunction(
        config.functionAppUrl,
        tokenResponse.accessToken,
        "prometheus",
        undefined,
        { amwResourceId, query: promql },
      );

      // The Function returns the full Prometheus response; extract results
      const resp = result as { status: string; data?: { result: PrometheusResult[] } };
      if (resp.status !== "success" || !resp.data?.result) {
        throw new Error(`Prometheus returned status: ${resp.status}`);
      }
      return resp.data.result;
    },
    enabled: (options?.enabled ?? true) && !!account && !!amwResourceId && !!config.functionAppUrl,
    staleTime: options?.staleTime ?? 60_000,
  });
}
