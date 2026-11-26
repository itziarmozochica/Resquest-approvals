import { MCP_APP_HOST_THEME_CSS } from './fz-assistant-mcp-app-host-theme.generated';

export const MCP_APP_HOST_THEME_STYLE_ID = 'fz-mcp-app-host-theme';

export const MCP_APP_HOST_THEME_META = '<meta name="color-scheme" content="light">';

export const MCP_APP_HOST_THEME_FONT_LINK =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap">';

export const MCP_APP_HOST_THEME_STYLE = `<style id="${MCP_APP_HOST_THEME_STYLE_ID}">${MCP_APP_HOST_THEME_CSS}</style>`;

export const MCP_APP_HOST_THEME_HEAD = `${MCP_APP_HOST_THEME_META}${MCP_APP_HOST_THEME_FONT_LINK}${MCP_APP_HOST_THEME_STYLE}`;
