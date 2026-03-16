import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

/**
 * Acquires an access token silently, falling back to interactive if needed.
 */
export function useToken() {
  const { instance, accounts } = useMsal();

  const acquireToken = async (scopes: string[]): Promise<string> => {
    const account = accounts[0];
    if (!account) throw new Error("No authenticated account");

    try {
      const response = await instance.acquireTokenSilent({
        scopes,
        account,
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        const response = await instance.acquireTokenPopup({ scopes });
        return response.accessToken;
      }
      throw error;
    }
  };

  return { acquireToken, account: accounts[0] };
}
