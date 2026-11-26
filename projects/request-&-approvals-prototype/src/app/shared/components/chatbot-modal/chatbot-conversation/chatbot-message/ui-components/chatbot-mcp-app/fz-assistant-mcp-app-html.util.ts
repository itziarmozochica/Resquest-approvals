import { MCP_APP_HOST_THEME_HEAD, MCP_APP_HOST_THEME_STYLE_ID } from './fz-assistant-mcp-app-host-theme';

/**
 * Inject the host theme into MCP App panel HTML (iframe blob documents only).
 *
 * Called exclusively from {@link ChatbotMcpAppComponent} for `ui://` resources.
 * Does not run for legacy HTTP panel URLs or any other FZ Assistant surface.
 */
export function applyMcpAppHostTheme(html: string): string {
  if (html.includes(MCP_APP_HOST_THEME_STYLE_ID)) {
    return html;
  }

  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${MCP_APP_HOST_THEME_HEAD}</head>`);
  }

  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${MCP_APP_HOST_THEME_HEAD}`);
  }

  if (/<html[\s>]/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${MCP_APP_HOST_THEME_HEAD}</head>`);
  }

  return `${MCP_APP_HOST_THEME_HEAD}${html}`;
}
