import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { managementScope } from "../auth/msalConfig";
import { acquireToken } from "../auth/acquireToken";
import { queryARG } from "../services/argClient";

/**
 * React Query hook for Azure Resource Graph queries.
 * Automatically acquires a management token via MSAL.
 */
export function useARGQuery(
  queryKey: string | string[],
  query: string,
  options?: Omit<UseQueryOptions<Record<string, unknown>[]>, "queryKey" | "queryFn">
) {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  return useQuery<Record<string, unknown>[]>({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    queryFn: async () => {
      if (!account) throw new Error("Not authenticated");
      const tokenResponse = await acquireToken(instance, account, managementScope);
      return queryARG(tokenResponse.accessToken, query);
    },
    enabled: !!account,
    ...options,
  });
}
