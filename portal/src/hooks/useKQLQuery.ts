import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { logAnalyticsScope } from "../auth/msalConfig";
import { acquireToken } from "../auth/acquireToken";
import { queryWorkspace, queryResource } from "../services/kqlClient";

/**
 * React Query hook for Log Analytics KQL queries.
 * Automatically acquires a Log Analytics token via MSAL.
 */
export function useKQLQuery(
  queryKey: string | string[],
  workspaceId: string,
  query: string,
  timespan?: string,
  options?: Omit<UseQueryOptions<Record<string, unknown>[]>, "queryKey" | "queryFn">
) {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  return useQuery<Record<string, unknown>[]>({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    queryFn: async () => {
      if (!account) throw new Error("Not authenticated");
      const tokenResponse = await acquireToken(instance, account, logAnalyticsScope);
      return queryWorkspace(
        tokenResponse.accessToken,
        workspaceId,
        query,
        timespan
      );
    },
    enabled: !!account && !!workspaceId,
    ...options,
  });
}

/**
 * React Query hook for App Insights KQL queries (queryResource).
 * Uses the full ARM resource ID of the App Insights resource.
 */
export function useAppInsightsQuery(
  queryKey: string | string[],
  resourceId: string,
  query: string,
  timespan?: string,
  options?: Omit<UseQueryOptions<Record<string, unknown>[]>, "queryKey" | "queryFn">
) {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  return useQuery<Record<string, unknown>[]>({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    queryFn: async () => {
      if (!account) throw new Error("Not authenticated");
      const tokenResponse = await acquireToken(instance, account, logAnalyticsScope);
      return queryResource(
        tokenResponse.accessToken,
        resourceId,
        query,
        timespan
      );
    },
    enabled: !!account && !!resourceId,
    ...options,
  });
}
