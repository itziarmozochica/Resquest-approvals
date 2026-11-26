import { CartHeaderContactEdit } from './cart-header-contact.model';

export function formatCartHeaderContactName(firstName: string = '', lastName: string = ''): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

export function resolveCartHeaderContactDisplayName(
  firstName: string | undefined,
  lastName: string | undefined,
  ownerFullName: string | undefined,
): string {
  return formatCartHeaderContactName(firstName ?? '', lastName ?? '') || (ownerFullName ?? '').trim();
}

export function hasCartHeaderContactChanges(original: CartHeaderContactEdit, updated: CartHeaderContactEdit): boolean {
  return (
    original.email.trim().toLowerCase() !== updated.email.trim().toLowerCase() ||
    original.firstName.trim() !== updated.firstName.trim() ||
    original.lastName.trim() !== updated.lastName.trim()
  );
}

export function normalizeCartHeaderContactEmail(email: string): string {
  return email.trim().toLowerCase();
}
