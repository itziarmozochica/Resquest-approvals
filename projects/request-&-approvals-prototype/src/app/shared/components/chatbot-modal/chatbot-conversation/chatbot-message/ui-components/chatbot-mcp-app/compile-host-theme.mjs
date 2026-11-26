/**
 * Compiles fz-assistant-mcp-app-host-theme.scss (Ignite foundations) into
 * fz-assistant-mcp-app-host-theme.generated.ts for iframe injection.
 *
 * Run from repo root:
 *   node src/app/shared/components/chatbot-modal/chatbot-conversation/chatbot-message/ui-components/chatbot-mcp-app/compile-host-theme.mjs
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const featureDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(featureDir, '../../../../../../../../..');
const scssPath = join(featureDir, 'fz-assistant-mcp-app-host-theme.scss');
const generatedPath = join(featureDir, 'fz-assistant-mcp-app-host-theme.generated.ts');

const rawCss = execSync(
  `npx sass "${scssPath}" --style=expanded --quiet-deps --load-path=src/theme --load-path=projects/ignite/theme/src --no-source-map`,
  { cwd: repoRoot, encoding: 'utf8' },
);

const css = rawCss
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const escapedCss = css.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const generated = `/**
 * AUTO-GENERATED — do not edit.
 * Source: fz-assistant-mcp-app-host-theme.scss (Ignite foundations)
 * Regenerate: node src/app/shared/components/chatbot-modal/chatbot-conversation/chatbot-message/ui-components/chatbot-mcp-app/compile-host-theme.mjs
 */
export const MCP_APP_HOST_THEME_CSS = \`${escapedCss}\`;
`;

writeFileSync(generatedPath, generated);
