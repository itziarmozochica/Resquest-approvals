import { escapeRegExp } from './regex.utils';

const PLACEHOLDER_EMAIL_PREFIX = 'no_email_provided_cart-';
const PLACEHOLDER_EMAIL_DOMAIN = '@internal.example.com';
const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

const PLACEHOLDER_EMAIL_REGEXP = new RegExp(
  `^${escapeRegExp(PLACEHOLDER_EMAIL_PREFIX)}${UUID_PATTERN}${escapeRegExp(PLACEHOLDER_EMAIL_DOMAIN)}$`,
);

export function buildPlaceholderEmail(cartId: string): string {
  return `${PLACEHOLDER_EMAIL_PREFIX}${cartId}${PLACEHOLDER_EMAIL_DOMAIN}`;
}

export function isPlaceholderEmail(email?: string | null): boolean {
  if (!email) {
    return false;
  }
  return PLACEHOLDER_EMAIL_REGEXP.test(email.trim().toLowerCase());
}
