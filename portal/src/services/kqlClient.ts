import { LogsQueryClient, LogsQueryResultStatus } from "@azure/monitor-query";

function toRows(result: { status: string; tables: { columns: { name?: string }[]; rows: unknown[][] }[] }): Record<string, unknown>[] {
  if (result.status === LogsQueryResultStatus.Success && result.tables.length > 0) {
    const table = result.tables[0];
    const columns = table.columns.map((c) => c.name ?? "");
    return table.rows.map((row) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }
  return [];
}

export async function queryWorkspace(
  token: string,
  workspaceId: string,
  query: string,
  timespan = "P1D"
): Promise<Record<string, unknown>[]> {
  const credential = {
    getToken: async () => ({ token, expiresOnTimestamp: Date.now() + 3600000 }),
  };
  const client = new LogsQueryClient(credential);
  // workspaceId may be a full ARM resource ID or a workspace GUID
  const isResourceId = workspaceId.startsWith("/");
  const result = isResourceId
    ? await client.queryResource(workspaceId, query, { duration: timespan })
    : await client.queryWorkspace(workspaceId, query, { duration: timespan });
  return toRows(result as never);
}

/** Query an App Insights resource by its full ARM resource ID */
export async function queryResource(
  token: string,
  resourceId: string,
  query: string,
  timespan = "P1D"
): Promise<Record<string, unknown>[]> {
  const credential = {
    getToken: async () => ({ token, expiresOnTimestamp: Date.now() + 3600000 }),
  };
  const client = new LogsQueryClient(credential);
  const result = await client.queryResource(resourceId, query, {
    duration: timespan,
  });
  return toRows(result as never);
}
