import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { managementScope } from "../auth/msalConfig";
import { acquireToken } from "../auth/acquireToken";
import {
  callFunction,
  getFunctionKey,
  type FunctionEndpoint,
} from "../services/functionClient";
import { useConfig } from "./useConfig";

interface BackendActionParams {
  endpoint: FunctionEndpoint;
  body?: Record<string, unknown>;
  queryParams?: Record<string, string>;
}

/**
 * React Query mutation hook for calling Function App endpoints.
 * Automatically resolves the function app URL from config, acquires a token,
 * and retrieves the function key via ARM API.
 */
export function useBackendAction(
  options?: Omit<UseMutationOptions<unknown, Error, BackendActionParams>, "mutationFn">
) {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const { config } = useConfig();

  return useMutation<unknown, Error, BackendActionParams>({
    mutationFn: async ({ endpoint, body, queryParams }) => {
      if (!account) throw new Error("Not authenticated");
      if (!config.functionAppUrl)
        throw new Error("Function App URL not configured");

      const tokenResponse = await acquireToken(instance, account, managementScope);

      // Retrieve function key if we have the function app resource ID
      let functionKey: string | undefined;
      if (config.functionAppId) {
        functionKey = await getFunctionKey(
          config.functionAppId,
          tokenResponse.accessToken
        );
      }

      return callFunction(
        config.functionAppUrl,
        tokenResponse.accessToken,
        endpoint,
        body,
        queryParams,
        functionKey
      );
    },
    ...options,
  });
}
