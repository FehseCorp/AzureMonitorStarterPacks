/**
 * Client for querying the Azure Monitor Workspace (managed Prometheus) API.
 *
 * Endpoint pattern:
 *   https://<amwName>.<region>.prometheus.monitor.azure.com/api/v1/query
 *
 * The query endpoint is derived from the full ARM resource ID of the Azure
 * Monitor Workspace, which encodes both the workspace name and location/region.
 * We resolve the actual query endpoint via the ARM API instead of guessing region
 * strings, since the AMW resource exposes a `metrics.prometheusQueryEndpoint` property.
 */

export interface PrometheusResult {
  metric: Record<string, string>;
  value: [number, string]; // [unixTimestamp, value]
}

interface PrometheusQueryResponse {
  status: string;
  data: {
    resultType: string;
    result: PrometheusResult[];
  };
}

/**
 * Resolve the Prometheus query endpoint for an Azure Monitor Workspace
 * by reading the resource via the ARM API.
 */
export async function getPrometheusEndpoint(
  managementToken: string,
  amwResourceId: string
): Promise<string> {
  const url = `https://management.azure.com${amwResourceId}?api-version=2023-04-03`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${managementToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to resolve AMW endpoint: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const endpoint: string | undefined =
    json.properties?.metrics?.prometheusQueryEndpoint;
  if (!endpoint) {
    throw new Error("Azure Monitor Workspace does not expose a Prometheus query endpoint");
  }
  return endpoint;
}

/**
 * Execute an instant PromQL query against the Azure Monitor Workspace.
 */
export async function queryPrometheus(
  prometheusEndpoint: string,
  prometheusToken: string,
  query: string
): Promise<PrometheusResult[]> {
  const params = new URLSearchParams({ query });
  const url = `${prometheusEndpoint}/api/v1/query?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${prometheusToken}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Prometheus query failed: ${res.status} — ${body}`);
  }
  const json: PrometheusQueryResponse = await res.json();
  if (json.status !== "success") {
    throw new Error(`Prometheus returned status: ${json.status}`);
  }
  return json.data.result;
}
