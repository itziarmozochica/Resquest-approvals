import { parseHttpUrl } from '@fz-original/app/shared/utils/http-url.util';

/**
 * The one URL policy for the whole editor. The field editor drafts a URL keystroke exactly as
 * typed, https or not — it is the publish validator, the module gap badge and the persist gate
 * that judge the draft, all through this one predicate, so a value can never read as valid in one
 * place and invalid in another.
 *
 * `new URL` lowercases the scheme, so `HTTPS://x` is the same URL — while a bare `https://` does
 * not parse at all and a non-string is never a URL.
 */
export function isHttpsUrl(value: unknown): value is string {
  return typeof value === 'string' && parseHttpUrl(value)?.protocol === 'https:';
}
