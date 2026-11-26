import { environment } from '../environment';
import { HeaderbarColors, RuntimeConfig, RuntimeShellConfig, ThirdPartyConfig } from './runtime-config.model';
import { recordServerClock } from './server-clock';

export const RUNTIME_CONFIG_URL = '/config.json';
export const THIRD_PARTY_SCRIPT_URL = 'assets/js/third-party-init.js';
export const RUNTIME_CONFIG_ERROR_MESSAGE = 'Fever Zone could not load its configuration. Please reload the page.';

const FAVICON_SELECTOR = 'link[rel="apple-touch-icon"], link[rel="icon"], link[rel="shortcut icon"]';

export async function loadRuntimeConfig(document: Document): Promise<void> {
  const config = await fetchRuntimeConfig();

  Object.assign(environment, config.environment);
  await applyShellConfig(config.shell, document);
}

export async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  const response = await fetch(RUNTIME_CONFIG_URL, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Could not load ${RUNTIME_CONFIG_URL}: HTTP ${response.status}`);
  }
  recordServerClock(response.headers);

  return response.json();
}

export function applyShellConfig(shell: RuntimeShellConfig, document: Document): Promise<void> {
  pointFaviconsAt(shell.faviconDirectory, document);

  if (shell.headerbarColors) {
    document.head.prepend(createHeaderbarStyle(shell.headerbarColors, document));
  }

  return loadThirdPartyScript(shell.thirdParty, document);
}

export function showRuntimeConfigError(document: Document, error: unknown): void {
  console.error(error);

  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.textContent = RUNTIME_CONFIG_ERROR_MESSAGE;
  document.querySelector('app-root')?.replaceChildren(message);
}

function pointFaviconsAt(directory: string, document: Document): void {
  document.querySelectorAll<HTMLLinkElement>(FAVICON_SELECTOR).forEach((link: HTMLLinkElement) => {
    const fileName = link.getAttribute('href')?.split('/').pop() ?? '';

    link.setAttribute('href', `${directory}${fileName}`);
  });
}

function createHeaderbarStyle(colors: HeaderbarColors, document: Document): HTMLStyleElement {
  const style = document.createElement('style');

  style.textContent = `:root { --headerbar-color-background: ${colors.background}; --headerbar-color-foreground: ${colors.foreground}; }`;

  return style;
}

function loadThirdPartyScript(thirdParty: ThirdPartyConfig, document: Document): Promise<void> {
  return new Promise((resolve: (value: void) => void) => {
    const script = document.createElement('script');

    script.src = THIRD_PARTY_SCRIPT_URL;
    Object.entries(thirdParty)
      .filter((entry: [string, string | undefined]): entry is [string, string] => entry[1] !== undefined)
      .forEach(([key, value]: [string, string]) => {
        script.dataset[key] = value;
      });
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => resolve());
    document.head.append(script);
  });
}
