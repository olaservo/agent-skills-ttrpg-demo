/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full server base override, e.g. "http://10.0.0.234:3030". */
  readonly VITE_MCP_BASE?: string;
  /** Port override when deriving base from the page host (default 3001). */
  readonly VITE_MCP_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
