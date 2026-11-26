import { SelectOption } from '../../../../shared/layout/filters/select/select.interface';
import { Business } from '../../../settings/shared/models/business.model';
import { PROFORMA_INVOICE_MIN_SEARCH_LENGTH } from '../models/proforma-invoice-dialog.model';

const TAX_ID_SEARCH_PATTERN = /^[\d\s-]+$/;

export function normalizeTaxId(taxId: string | null | undefined): string {
  return (taxId ?? '').replace(/[^\da-z]/gi, '').toLowerCase();
}

export function isTaxIdSearch(term: string): boolean {
  return TAX_ID_SEARCH_PATTERN.test(term) && normalizeTaxId(term).length >= PROFORMA_INVOICE_MIN_SEARCH_LENGTH;
}

export function businessTaxIdContains(business: Business, term: string): boolean {
  const normalizedTerm = normalizeTaxId(term);
  return normalizedTerm.length > 0 && normalizeTaxId(business.taxIdentificationNumber).includes(normalizedTerm);
}

export function mergeBusinesses(first: Business[], second: Business[]): Business[] {
  const seen = new Set(first.map(business => business.id));
  return [...first, ...second.filter(business => !seen.has(business.id))];
}

export function toBusinessOption(business: Business): SelectOption {
  const description = [business.taxIdentificationNumber, business.email].filter(Boolean).join(' · ');
  return { description, id: business.id, title: business.name };
}
