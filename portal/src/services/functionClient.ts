const FUNCTION_ENDPOINTS = {
  packmgmt: "/api/packmgmt",
  alertConfigMgmt: "/api/alertConfigMgmt",
  agentMgmt: "/api/agentMgmt",
  opstasksondemand: "/api/opstasksondemand",
  config: "/api/config",
  policymgmt: "/api/policymgmt",
} as const;

export type FunctionEndpoint = keyof typeof FUNCTION_ENDPOINTS;

/**
 * In dev mode, if VITE_FUNC_APP_URL is set, route through the Vite proxy
 * to avoid CORS. In production, use the direct Function App URL.
 */
function resolveBaseUrl(funcAppUrl: string): string {
  if (import.meta.env.DEV && import.meta.env.VITE_FUNC_APP_URL) {
    return "/funcproxy";
  }
  return funcAppUrl;
}

// Cache for the function host key (per function app resource ID)
const keyCache = new Map<string, { key: string; expiresAt: number }>();

/**
 * Retrieve the Function App host key via the ARM API.
 * Uses the management token the portal already has.
 * Caches for 1 hour.
 */
export async function getFunctionKey(
  functionAppId: string,
  managementToken: string
): Promise<string> {
  const cached = keyCache.get(functionAppId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.key;
  }

  const url = `https://management.azure.com${functionAppId}/host/default/listkeys?api-version=2022-03-01`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${managementToken}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to retrieve function key (${response.status})`);
  }
  const data = (await response.json()) as { functionKeys?: Record<string, string>; masterKey?: string };
  const key = data.functionKeys?.default ?? data.masterKey ?? "";
  if (!key) {
    throw new Error("No function key found in response");
  }

  keyCache.set(functionAppId, { key, expiresAt: Date.now() + 3600_000 });
  return key;
}

export async function callFunction(
  funcAppUrl: string,
  token: string,
  endpoint: FunctionEndpoint,
  body?: Record<string, unknown>,
  queryParams?: Record<string, string>,
  functionKey?: string
): Promise<unknown> {
  const base = resolveBaseUrl(funcAppUrl);
  const path = FUNCTION_ENDPOINTS[endpoint];

  // Merge function key into query params if provided
  const allParams = { ...queryParams };
  if (functionKey) {
    allParams["code"] = functionKey;
  }

  // For proxy (relative) paths, build URL manually; for absolute, use URL constructor
  let fullUrl: string;
  if (base.startsWith("/")) {
    fullUrl = base + path;
    const paramStr = new URLSearchParams(allParams).toString();
    if (paramStr) {
      fullUrl += "?" + paramStr;
    }
  } else {
    const url = new URL(path, base);
    Object.entries(allParams).forEach(([k, v]) => url.searchParams.set(k, v));
    fullUrl = url.toString();
  }

  const response = await fetch(fullUrl, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Function call failed (${response.status}): ${text}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}
