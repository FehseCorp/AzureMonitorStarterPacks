const FUNCTION_ENDPOINTS = {
  packmgmt: "/api/packmgmt",
  alertConfigMgmt: "/api/alertConfigMgmt",
  agentMgmt: "/api/agentMgmt",
  config: "/api/config",
  policymgmt: "/api/policymgmt",
  prometheus: "/api/prometheus",
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

export async function callFunction(
  funcAppUrl: string,
  token: string,
  endpoint: FunctionEndpoint,
  body?: Record<string, unknown>,
  queryParams?: Record<string, string>,
): Promise<unknown> {
  const base = resolveBaseUrl(funcAppUrl);
  const path = FUNCTION_ENDPOINTS[endpoint];

  const allParams = { ...queryParams };

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
