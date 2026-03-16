import { ResourceGraphClient } from "@azure/arm-resourcegraph";

export async function queryARG(
  token: string,
  query: string,
  subscriptions?: string[]
): Promise<Record<string, unknown>[]> {
  const credential = {
    getToken: async () => ({ token, expiresOnTimestamp: Date.now() + 3600000 }),
  };
  const client = new ResourceGraphClient(credential);
  const result = await client.resources({
    query,
    subscriptions: subscriptions ?? [],
    options: { resultFormat: "objectArray" },
  });
  return (result.data as Record<string, unknown>[]) ?? [];
}
