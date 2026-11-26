/**
 * Contract for the FZ Assistant MCP App host (`ChatbotMcpAppComponent`).
 *
 * MCP Apps (SEP-1865) render a sandboxed iframe alongside the chat. The panel
 * loads `@modelcontextprotocol/ext-apps` and talks to the host via JSON-RPC 2.0
 * over `postMessage`. The method names and payload shapes below are the wire
 * contract of `ext-apps@0.4.0` — the SDK validates them with zod on the panel
 * side, so the host must match them exactly.
 */

/** Wire protocol version negotiated with the panel SDK. */
export const MCP_APP_PROTOCOL_VERSION = '2025-11-21' as const;

/** JSON-RPC method names exchanged with the panel (ext-apps wire names). */
export const McpAppMethod = {
  /** Panel → host handshake; host replies with {@link McpAppInitializeResult}. */
  INITIALIZE: 'ui/initialize',
  /** Panel → host: `sendMessage`. */
  MESSAGE: 'ui/message',
  /** Panel → host notification: panel is connected and its handlers are ready. */
  NOTIFY_INITIALIZED: 'ui/notifications/initialized',
  /** Panel → host notification: iframe content resized. */
  NOTIFY_SIZE_CHANGED: 'ui/notifications/size-changed',
  /** Host → panel notification: pushes a tool result (drives `app.ontoolresult`). */
  NOTIFY_TOOL_RESULT: 'ui/notifications/tool-result',
  /** Panel → host: `openLink`. */
  OPEN_LINK: 'ui/open-link',
  /** Panel → host: `callServerTool`; host proxies and replies with a CallToolResult. */
  TOOLS_CALL: 'tools/call',
  /** Panel → host: `updateModelContext`. */
  UPDATE_MODEL_CONTEXT: 'ui/update-model-context',
} as const;
export type McpAppMethod = (typeof McpAppMethod)[keyof typeof McpAppMethod];

/** JSON-RPC error codes used by the host. */
export const JSON_RPC_METHOD_NOT_FOUND = -32601;
export const JSON_RPC_INTERNAL_ERROR = -32603;

export type JsonRpcId = number | string;

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  id?: JsonRpcId;
  params?: unknown;
}

export interface JsonRpcResultResponse {
  id: JsonRpcId | undefined;
  jsonrpc: '2.0';
  result: unknown;
}

export interface JsonRpcErrorResponse {
  error: { code: number; message: string };
  id: JsonRpcId | undefined;
  jsonrpc: '2.0';
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

/** Anything the host posts back into the iframe. */
export type JsonRpcOutbound = JsonRpcResultResponse | JsonRpcErrorResponse | JsonRpcNotification;

/** A content block as received from / sent to the panel. */
export interface McpAppContentBlock {
  type: string;
  _meta?: Record<string, unknown>;
  text?: string;
}

/** A text content block produced by the host inside a CallToolResult. */
export interface McpAppTextContent {
  text: string;
  type: 'text';
  _meta?: Record<string, unknown>;
}

/**
 * A spec-compliant `CallToolResult`. ext-apps validates BOTH the `tools/call`
 * response and the `ui/notifications/tool-result` params against this schema,
 * and `content` is REQUIRED — so the host must always wrap raw tool payloads
 * in this envelope (never return a bare dict).
 */
export interface McpAppToolResult {
  content: McpAppTextContent[];
  isError: boolean;
  structuredContent?: Record<string, unknown>;
}

/** Color theme accepted by ext-apps (`union(light, dark)`). */
export type McpAppTheme = 'light' | 'dark';

/**
 * Live host context exposed to the panel via `ui/initialize`.
 *
 * NOTE: ext-apps validates this against its own `hostContext` schema, which
 * keeps only the keys it knows (`theme`, …) and strips the rest. The extra FZ
 * keys below are harmless — kept for parity/debugging — but the panel will not
 * read them back through `getHostContext()`.
 */
export interface McpAppHostContext {
  appName: string;
  locale: string;
  partnerId: number | null;
  theme: McpAppTheme;
  threadId: string | null;
  timestamp: string;
}

/** Host capabilities advertised to the panel (ext-apps `hostCapabilities` keys). */
export interface McpAppHostCapabilities {
  openLinks: Record<string, never>;
  serverResources: Record<string, never>;
  serverTools: Record<string, never>;
}

export interface McpAppImplementationInfo {
  name: string;
  version: string;
}

/** The `ui/initialize` reply shape ext-apps parses (`Pe`). */
export interface McpAppInitializeResult {
  hostCapabilities: McpAppHostCapabilities;
  hostContext: McpAppHostContext;
  hostInfo: McpAppImplementationInfo;
  protocolVersion: string;
}

/** Host identity declared to every panel. */
export const MCP_APP_HOST_INFO: McpAppImplementationInfo = { name: 'FZ Assistant', version: '1.0.0' };

/** Capabilities the host declares: it can proxy tool calls, read resources and open links. */
export const MCP_APP_HOST_CAPABILITIES: McpAppHostCapabilities = {
  openLinks: {},
  serverResources: {},
  serverTools: {},
};

/** Structured-content key carrying the FZ-only host directive. */
export const MCP_APP_HOST_HINTS_KEY = '_hostHints';

/**
 * FZ-only directive a widget may attach to `structuredContent._hostHints`.
 * Stripped before the context is injected so it never reaches the model.
 */
export interface McpAppHostHints {
  triggerResponse?: boolean;
}

/**
 * The `data` input every chatbot UI component receives.
 * `id` is the panel resource URI (`ui://…`) or a legacy HTTP URL.
 * `meta.tool_result` carries the initial data pushed to the panel on connect.
 */
export interface McpAppComponentData {
  id: string;
  meta?: { tool_result?: Record<string, unknown> } & Record<string, unknown>;
}

/**
 * Collaborator the bridge drives to perform host side-effects. Implemented by
 * `ChatbotMcpAppComponent`; kept free of Angular so the bridge stays a pure,
 * easily testable protocol router.
 */
export interface McpAppHost {
  /** Live host context for the `ui/initialize` reply. */
  buildHostContext(): McpAppHostContext;
  /** Proxy a server tool call; `resolve` receives the raw result dict. */
  callServerTool(
    toolName: string,
    args: Record<string, unknown>,
    resolve: (raw: Record<string, unknown>) => void,
    reject: (message: string) => void,
  ): void;
  /** Deliver a `sendMessage`: submit now (`autoSubmit`) or prefill the composer. */
  deliverMessage(text: string, autoSubmit: boolean): void;
  /** Raw payload to push to the panel on `initialized` (wrapped by the bridge). */
  initialToolResultPayload(): Record<string, unknown>;
  /** Open an external URL in a new tab. */
  openExternalLink(url: string): void;
  /** Post a JSON-RPC response/notification to the iframe (host adds targetOrigin). */
  postToFrame(message: JsonRpcOutbound): void;
  /** Resize the iframe to `height` px (`size-changed`). */
  resizeFrame(height: number): void;
  /** Persist an `updateModelContext` payload; `ack` posts the JSON-RPC reply. */
  updateModelContext(
    content: McpAppContentBlock[],
    structuredContent: Record<string, unknown> | undefined,
    triggerResponse: boolean,
    ack: () => void,
  ): void;
}
