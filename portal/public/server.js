import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const PORT = process.env.PORT || 8080;
const ROOT = "/home/site/wwwroot";

const MIME = {
  ".html": "text/html",
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".json": "application/json",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
};

// Build config.json from App Service environment variables
function buildConfig() {
  return JSON.stringify({
    clientId:                  process.env.AZURE_CLIENT_ID || "",
    tenantId:                  process.env.AZURE_TENANT_ID || "",
    instanceName:              process.env.INSTANCE_NAME || "",
    functionAppUrl:            process.env.FUNCTION_APP_URL || "",
    functionAppResourceId:     process.env.FUNCTION_APP_RESOURCE_ID || "",
    functionAppName:           process.env.FUNCTION_APP_NAME || "",
    workspaceId:               process.env.LAW_RESOURCE_ID || "",
    workspaceName:             process.env.LAW_NAME || "",
    appInsightsId:             process.env.APP_INSIGHTS_ID || "",
    appInsightsName:           process.env.APP_INSIGHTS_NAME || "",
    azureMonitorWorkspaceId:   process.env.AMW_ID || "",
    azureMonitorWorkspaceName: process.env.AMW_NAME || "",
  });
}

createServer(async (req, res) => {
  // Serve config.json dynamically from env vars
  if (req.url === "/config.json") {
    const body = buildConfig();
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-cache" });
    res.end(body);
    return;
  }

  // Static file serving with SPA fallback
  let filePath = join(ROOT, req.url === "/" ? "index.html" : req.url);
  try {
    const data = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    // SPA fallback — serve index.html for any non-file route
    try {
      const html = await readFile(join(ROOT, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    } catch {
      res.writeHead(404);
      res.end("Not Found");
    }
  }
}).listen(PORT, () => {
  console.log(`Portal server listening on port ${PORT}`);
});
