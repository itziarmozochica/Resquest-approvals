import { AgreementStatus } from '../enums/agreement-status.enum';
import { PolicyStatus } from '../enums/policy-status.enum';
import type { AgreementVersion } from '../models/agreement-version.model';
import type { Agreement } from '../models/agreement.model';
import { parseAgreementDateTime } from './agreement-datetime.util';

const EM_DASH = '—';
const blockTagPattern = /<(p|br|div|ul|ol|li|h[1-6]|table|blockquote|hr)\b/i;

export type TagSentiment = 'positive' | 'danger' | 'warning' | 'accent' | 'info' | 'disable' | 'sharp';

export interface StatusTag {
  label: string;
  sentiment: TagSentiment;
}

export function formatAgreementDate(value: string | null): string {
  if (!value) {
    return EM_DASH;
  }
  const parsed = parseAgreementDateTime(value);
  if (!parsed) {
    return EM_DASH;
  }
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function agreementStatusTag(status: AgreementStatus): StatusTag {
  switch (status) {
    case AgreementStatus.active:
      return { label: 'Active', sentiment: 'positive' };
    case AgreementStatus.draft:
      return { label: 'Draft', sentiment: 'warning' };
    case AgreementStatus.archived:
      return { label: 'Archived', sentiment: 'disable' };
  }
}

export function policyStatusTag(status: PolicyStatus): StatusTag {
  return status === PolicyStatus.active ? { label: 'Active', sentiment: 'positive' } : { label: 'Inactive', sentiment: 'disable' };
}

export function isVersionReplaced(version: AgreementVersion, allVersions: readonly AgreementVersion[]): boolean {
  return allVersions.some(other => other.supersedesVersionId === version.id);
}

export function versionStateTag(version: AgreementVersion, allVersions: readonly AgreementVersion[]): StatusTag {
  return isVersionReplaced(version, allVersions)
    ? { label: 'Replaced', sentiment: 'disable' }
    : { label: 'Current', sentiment: 'positive' };
}

export function currentVersion(agreement: Agreement): AgreementVersion | undefined {
  const { versions } = agreement;
  const active = versions.filter(version => !isVersionReplaced(version, versions));
  if (active.length === 0) {
    return undefined;
  }
  return active.reduce((highest, candidate) => (candidate.version > highest.version ? candidate : highest));
}

export function reuseTag(version: AgreementVersion): StatusTag {
  return version.priorAcceptanceValid
    ? { label: 'Reuse enabled', sentiment: 'positive' }
    : { label: 'Re-sign required', sentiment: 'danger' };
}

export function isPlainTextLegalContent(content: string): boolean {
  return !blockTagPattern.test(content);
}
