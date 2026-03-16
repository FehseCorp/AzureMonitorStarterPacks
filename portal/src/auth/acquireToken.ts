import { type IPublicClientApplication, type AccountInfo, type AuthenticationResult, InteractionRequiredAuthError } from "@azure/msal-browser";

/**
 * Acquire a token silently, falling back to an interactive redirect
 * when the user hasn't consented to the requested scope yet
 * (e.g. AADSTS65001 / InteractionRequiredAuthError).
 *
 * Uses redirect (not popup) to stay consistent with the login flow.
 * If a redirect is triggered this function will not return — the page
 * will navigate to Azure AD and come back via handleRedirectPromise.
 */
export async function acquireToken(
  instance: IPublicClientApplication,
  account: AccountInfo,
  scopeRequest: { scopes: string[] }
): Promise<AuthenticationResult> {
  try {
    return await instance.acquireTokenSilent({ ...scopeRequest, account });
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      // This will redirect the page; the promise never resolves here.
      await instance.acquireTokenRedirect({ ...scopeRequest, account });
      // Unreachable, but keeps TS happy:
      throw err;
    }
    throw err;
  }
}
