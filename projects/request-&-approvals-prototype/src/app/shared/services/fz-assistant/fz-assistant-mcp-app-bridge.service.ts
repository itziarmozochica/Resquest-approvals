import { Injectable } from '@angular/core';

import {
  JSON_RPC_INTERNAL_ERROR,
  JSON_RPC_METHOD_NOT_FOUND,
  JsonRpcRequest,
  MCP_APP_HOST_CAPABILITIES,
  MCP_APP_HOST_HINTS_KEY,
  MCP_APP_HOST_INFO,
  MCP_APP_PROTOCOL_VERSION,
  McpAppContentBlock,
  McpAppHost,
  McpAppHostHints,
  McpAppInitializeResult,
  McpAppMethod,
  McpAppTextContent,
  McpAppToolResult,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-mcp-app.model';

/**
 * Pure JSON-RPC router for the MCP App host protocol.
 *
 * It owns the wire contract (method routing, the `ui/initialize` reply shape and
 * the spec-compliant `CallToolResult` envelope) and delegates every side effect
 * to a {@link McpAppHost}. It holds no state and touches no Angular APIs beyond
 * `@Injectable`, so it can be exercised end-to-end with a fake host in a plain
 * unit test (no `TestBed`, no iframe).
 */
@Injectable({ providedIn: 'root' })
export class FzAssistantMcpAppBridgeService {
  /** Route one inbound `postMessage` payload from the panel to the host. */
  route(message: unknown, host: McpAppHost): void {
    if (!this.#isJsonRpcRequest(message)) return;

    const id = message.id;
    const params: Record<string, unknown> = (message.params as Record<string, unknown>) ?? {};

    switch (message.method) {
      case McpAppMethod.INITIALIZE:
        host.postToFrame({ id, jsonrpc: '2.0', result: this.#buildInitializeResult(host) });
        break;

      case McpAppMethod.NOTIFY_INITIALIZED:
        // Push the initial tool result only once the panel is connected and its
        // `ontoolresult` handler is registered — the spec-correct trigger (no timers).
        host.postToFrame({
          jsonrpc: '2.0',
          method: McpAppMethod.NOTIFY_TOOL_RESULT,
          params: this.toCallToolResult(host.initialToolResultPayload()),
        });
        break;

      case McpAppMethod.TOOLS_CALL: {
        const toolName: string = typeof params['name'] === 'string' ? (params['name'] as string) : '';
        const args: Record<string, unknown> = (params['arguments'] as Record<string, unknown>) ?? {};
        host.callServerTool(
          toolName,
          args,
          (raw: Record<string, unknown>) => host.postToFrame({ id, jsonrpc: '2.0', result: this.toCallToolResult(raw) }),
          (errorMessage: string) =>
            host.postToFrame({ error: { code: JSON_RPC_INTERNAL_ERROR, message: errorMessage }, id, jsonrpc: '2.0' }),
        );
        break;
      }

      case McpAppMethod.MESSAGE: {
        const { autoSubmit, text } = this.#parseMessage(params);
        if (text) host.deliverMessage(text, autoSubmit);
        host.postToFrame({ id, jsonrpc: '2.0', result: {} });
        break;
      }

      case McpAppMethod.UPDATE_MODEL_CONTEXT: {
        const content: McpAppContentBlock[] = this.#readContent(params);
        const structuredContent = params['structuredContent'] as Record<string, unknown> | undefined;
        const triggerResponse: boolean = this.#readHostHints(structuredContent).triggerResponse === true;
        // Strip the host-only directive so it never becomes part of the model context.
        const cleanStructuredContent = this.#stripHostHints(structuredContent);
        host.updateModelContext(content, cleanStructuredContent, triggerResponse, () =>
          host.postToFrame({ id, jsonrpc: '2.0', result: {} }),
        );
        break;
      }

      case McpAppMethod.OPEN_LINK: {
        const url = params['url'];
        if (typeof url === 'string' && url) host.openExternalLink(url);
        host.postToFrame({ id, jsonrpc: '2.0', result: {} });
        break;
      }

      case McpAppMethod.NOTIFY_SIZE_CHANGED: {
        const height = params['height'];
        if (typeof height === 'number' && Number.isFinite(height)) host.resizeFrame(height);
        break;
      }

      default:
        // Only requests (with an id) get an error reply; unknown notifications are ignored.
        if (id !== undefined) {
          host.postToFrame({
            error: { code: JSON_RPC_METHOD_NOT_FOUND, message: `Method not found: ${message.method}` },
            id,
            jsonrpc: '2.0',
          });
        }
    }
  }

  /**
   * Wrap a raw tool payload in a spec-compliant `CallToolResult`.
   *
   * ext-apps validates the `tools/call` response (and the tool-result
   * notification) against `CallToolResult`, whose `content` array is required.
   * Returning the bare backend dict would fail that validation and reject the
   * panel's `callServerTool()`/`ontoolresult`.
   */
  toCallToolResult(payload: Record<string, unknown>): McpAppToolResult {
    // Contract with `/mcp-app-proxy` (data-ai-agents): a tool-level failure comes back as
    // HTTP 200 with `{ isError: true, error }`; a transport failure rejects instead and never
    // reaches here. The strict `=== true` keeps every payload that predates that contract on
    // the success path, so the two repos can deploy in either order.
    if (payload.isError === true) {
      const message = this.#toolErrorText(payload);
      return {
        content: [{ text: message, type: 'text' }],
        isError: true,
        structuredContent: payload,
      };
    }
    return {
      content: [{ text: JSON.stringify(payload), type: 'text' }],
      isError: false,
      structuredContent: payload,
    };
  }

  #buildInitializeResult(host: McpAppHost): McpAppInitializeResult {
    return {
      hostCapabilities: MCP_APP_HOST_CAPABILITIES,
      hostContext: host.buildHostContext(),
      hostInfo: MCP_APP_HOST_INFO,
      protocolVersion: MCP_APP_PROTOCOL_VERSION,
    };
  }

  #isJsonRpcRequest(message: unknown): message is JsonRpcRequest {
    return (
      !!message &&
      typeof message === 'object' &&
      (message as { jsonrpc?: unknown }).jsonrpc === '2.0' &&
      typeof (message as { method?: unknown }).method === 'string'
    );
  }

  #isTextBlock(block: unknown): block is McpAppTextContent {
    return (
      block !== null &&
      typeof block === 'object' &&
      (block as { type?: unknown }).type === 'text' && // narrowing an index probe, no runtime claim
      typeof (block as { text?: unknown }).text === 'string' // same probe, same reason
    );
  }

  #parseMessage(params: Record<string, unknown>): { autoSubmit: boolean; text: string } {
    // The autoSubmit hint rides in the content block's `_meta` — the only
    // schema-legal passthrough for ui/message (its params are { role, content }).
    const block = this.#readContent(params).find((b: McpAppContentBlock) => b.type === 'text');
    return { autoSubmit: block?._meta?.['autoSubmit'] === true, text: block?.text ?? '' };
  }

  #readContent(params: Record<string, unknown>): McpAppContentBlock[] {
    const content = params['content'];
    return Array.isArray(content) ? (content as McpAppContentBlock[]) : [];
  }

  #readHostHints(structuredContent: Record<string, unknown> | undefined): McpAppHostHints {
    const hints = structuredContent?.[MCP_APP_HOST_HINTS_KEY];
    return hints && typeof hints === 'object' ? (hints as McpAppHostHints) : {};
  }

  #stripHostHints(structuredContent: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!structuredContent || !(MCP_APP_HOST_HINTS_KEY in structuredContent)) return structuredContent;
    return Object.fromEntries(Object.entries(structuredContent).filter(([key]: [string, unknown]) => key !== MCP_APP_HOST_HINTS_KEY));
  }

  /** Best-effort human-readable text for a failed tool call: the proxy's `error`, else the first MCP text block. */
  #toolErrorText(payload: Record<string, unknown>): string {
    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error;
    }
    // MCP-native shape: the message rides in the first text block of `content`.
    const content: unknown[] = Array.isArray(payload.content) ? payload.content : [];
    for (const block of content) {
      if (this.#isTextBlock(block) && block.text.trim()) {
        return block.text;
      }
    }
    // Matches UNKNOWN_TOOL_ERROR in mcp-business-ops-apps' `lib/tool-result.ts`: the panels
    // recognise this exact string as "no information about the outcome" and refuse to show it
    // as a definite result. Keep the two in sync rather than translating or rewording it.
    return 'unknown error';
  }
}
