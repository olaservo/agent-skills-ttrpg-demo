import { useEffect, useState } from "react";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ClientCapabilities } from "@modelcontextprotocol/sdk/types.js";
import { UI_EXTENSION_CAPABILITIES } from "@mcp-ui/client";
import { SERVER_BASE } from "./serverBase";

/**
 * Connect a browser MCP client to the server over StreamableHTTP. Passing this
 * client to AppRenderer is what advertises `serverTools` to widgets, enabling
 * widget-initiated actions like the dice RE-ROLL button to call back live.
 */
export function useMcpClient(): Client | null {
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    let active = true;
    let connected: Client | null = null;

    // mcp-ui and the SDK pin slightly different ext-apps versions, so the
    // extensions capability type doesn't line up structurally — the runtime
    // value is correct; cast through the SDK's ClientCapabilities.
    const capabilities = {
      roots: { listChanged: true },
      extensions: UI_EXTENSION_CAPABILITIES,
    } as unknown as ClientCapabilities;

    (async () => {
      const c = new Client(
        { name: "reachy-dm-phone", version: "0.1.0" },
        { capabilities },
      );
      await c.connect(new StreamableHTTPClientTransport(new URL(`${SERVER_BASE}/mcp`)));
      connected = c;
      if (active) setClient(c);
      else await c.close();
    })().catch((e) => console.error("[phone] MCP connect failed:", e));

    return () => {
      active = false;
      connected?.close().catch(() => {});
    };
  }, []);

  return client;
}
