import { FZ_ASSISTANT_SECRET_AUTOCOMPLETE_TOKENS } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-discover.model';
import { FzAssistantWireValue } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';

const secretAutocompleteTokens = new Set<string>(FZ_ASSISTANT_SECRET_AUTOCOMPLETE_TOKENS);

const secretNamePattern = /(?:^|[_-])(password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key|client[_-]?secret)(?:$|[_-])/i;

export function isFzAssistantSecretField(element: Element): boolean {
  if (isPasswordInput(element)) {
    return true;
  }

  if (hasSecretAutocomplete(element)) {
    return true;
  }

  return hasSecretNameOrId(element);
}

/**
 * Wire-boundary redaction for Discover emission.
 * - Secret fields → omit value
 * - iframes → {@link sanitizeFzAssistantIframeSrc} (query/fragment + JWT-like path segments)
 */
export function redactFzAssistantSecretValue(element: Element, value: FzAssistantWireValue | undefined): FzAssistantWireValue | undefined {
  if (isIframeElement(element)) {
    if (typeof value !== 'string') {
      return value;
    }

    return sanitizeFzAssistantIframeSrc(value);
  }

  if (!isFzAssistantSecretField(element)) {
    return value;
  }

  return undefined;
}

/**
 * Agent-safe iframe URL: origin + pathname, no query/fragment, JWT-like path segments redacted.
 * Leaves `about:*` sentinels unchanged. Applied at map time and again at capture redaction.
 */
export function sanitizeFzAssistantIframeSrc(src: string): string {
  const normalized = src.replace(/\s+/g, ' ').trim();
  if (normalized === '' || normalized === 'about:blank' || normalized === 'about:srcdoc') {
    return normalized;
  }

  try {
    const url = new URL(normalized);
    return `${url.origin}${redactJwtLikePathSegments(url.pathname)}`;
  } catch {
    const withoutHash = normalized.split('#')[0] ?? normalized;
    const withoutQuery = withoutHash.split('?')[0] ?? withoutHash;
    return redactJwtLikePathSegments(withoutQuery);
  }
}

/**
 * Metabase signed embeds put the JWT in a path segment (`/embed/dashboard/<jwt>`).
 * `eyJ` is the base64url prefix of a JSON JWT header (`{"…`).
 */
const JWT_LIKE_PATH_SEGMENT = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function redactJwtLikePathSegments(pathname: string): string {
  return pathname
    .split('/')
    .map(segment => (JWT_LIKE_PATH_SEGMENT.test(segment) ? '[redacted]' : segment))
    .join('/');
}

function isIframeElement(element: Element): boolean {
  return element instanceof HTMLIFrameElement || element.tagName.toLowerCase() === 'iframe';
}

function isPasswordInput(element: Element): boolean {
  if (!(element instanceof HTMLInputElement)) {
    return false;
  }

  return element.type.toLowerCase() === 'password';
}

function hasSecretAutocomplete(element: Element): boolean {
  const autocomplete = element.getAttribute('autocomplete');
  if (autocomplete === null || autocomplete.trim() === '') {
    return false;
  }

  for (const token of autocomplete.trim().toLowerCase().split(/\s+/)) {
    if (secretAutocompleteTokens.has(token)) {
      return true;
    }
  }

  return false;
}

function hasSecretNameOrId(element: Element): boolean {
  const name = element.getAttribute('name');
  if (name !== null && secretNamePattern.test(name)) {
    return true;
  }

  const id = element.getAttribute('id');
  return id !== null && secretNamePattern.test(id);
}
