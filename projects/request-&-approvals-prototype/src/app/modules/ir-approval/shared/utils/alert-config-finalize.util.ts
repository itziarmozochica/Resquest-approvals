import { AlertDirectoryRow } from '@fz-original/app/shared/services/alert-directory/alert-directory.model';

import {
  AlertDirectories,
  alertDirectoryLoadFailedError,
  alertDirectoryLoadingError,
  FinalizeAlertConfigResult,
  FinalizeErrorMessage,
} from '../models/alert-config-finalize.model';
import { AlertConfigFormValue, AlertLocale, RecipientDelivery, selectedRecipients } from '../models/alert-config.model';

const SLACK_USER = /^U[A-Z0-9]{6,}$/i;
const SLACK_CHANNEL = /^C[A-Z0-9]{8,}$/i;
const MENTION_WRAPPERS = /^<@|>$/g;
const SUPPORTED_LOCALES: readonly AlertLocale[] = ['en', 'es', 'fr', 'it', 'de'];

/** Maps a {@link finalizeAlertConfigForPersist} error code onto a displayable message. */
export function describeFinalizeError(error: string): FinalizeErrorMessage | null {
  if (error === 'recipient_delivery_required' || error === 'no_alert_targets') {
    return { key: 'alertConfigForm.errors.pickOneChannel' };
  }
  if (error === 'validation_mode_needs_recipient') {
    return { key: 'alertConfigForm.errors.validationModeNeedsRecipient' };
  }
  if (error === alertDirectoryLoadingError || error === alertDirectoryLoadFailedError) {
    return null;
  }
  if (error === 'reminder_schedule_required') {
    return { key: 'alertConfigForm.errors.tzAndHourPaired' };
  }
  if (error.startsWith('slack_dm_missing_user:') || error.startsWith('pm_slack_dm_missing_user:')) {
    return { key: 'alertConfigForm.errors.slackIdRequired', params: { email: error.split(':')[1] ?? '' } };
  }
  return { raw: error };
}

interface EmailTarget {
  to: string;
  locale: AlertLocale;
}

type SlackTarget =
  | { kind: 'dm'; userId: string; locale: AlertLocale }
  | { kind: 'channel'; channelId: string; locale: AlertLocale; mentionUserId?: string };

interface BuiltTargets {
  emails: EmailTarget[];
  slack: SlackTarget[];
  errors: string[];
}

/** Maps a UI/DB value onto a supported copy locale (accepts BCP-47 like `es-ES`). */
export function parseAlertLocale(raw: unknown): AlertLocale {
  if (raw == null) {
    return 'en';
  }
  const base = String(raw).toLowerCase().split('-')[0] as AlertLocale;
  return SUPPORTED_LOCALES.includes(base) ? base : 'en';
}

/** Resolved Slack member ID: a valid manual `U…` override wins, else the directory row. */
export function slackMemberIdForAlertDirectoryRow(row: AlertDirectoryRow, overrides: Record<string, string> | undefined): string | null {
  const manual = String(overrides?.[row.emailNorm] ?? '')
    .trim()
    .replace(MENTION_WRAPPERS, '');
  if (SLACK_USER.test(manual)) {
    return manual;
  }
  const sid = (row.slackUserId ?? '').trim();
  return SLACK_USER.test(sid) ? sid : null;
}

export function resolveAlertRecipientDisplays(
  value: AlertConfigFormValue,
  directories: AlertDirectories,
): { partners: string[]; fever: string[] } {
  const pick = (delivery: Record<string, RecipientDelivery> | undefined, directory: AlertDirectoryRow[]): string[] =>
    directory
      .filter(row => {
        const d = delivery?.[row.emailNorm];
        return Boolean(d && (d.email === true || d.slack === true));
      })
      .map(row => row.emailDisplay);
  return {
    partners: pick(value.recipientDelivery, directories.partnerDirectory),
    fever: pick(value.pmRecipientDelivery, directories.pmDirectory),
  };
}

function buildTargetsFromDeliveryMap(
  delivery: Record<string, RecipientDelivery> | undefined,
  directory: AlertDirectoryRow[],
  overrides: Record<string, string> | undefined,
  defaultLocale: AlertLocale,
): BuiltTargets {
  const errors: string[] = [];
  const emails: EmailTarget[] = [];
  const slack: SlackTarget[] = [];
  const map = delivery ?? {};

  for (const row of directory) {
    const d = map[row.emailNorm];
    if (!d) {
      continue;
    }
    const locale = parseAlertLocale(d.locale ?? defaultLocale);
    if (d.email === true) {
      const to = row.emailDisplay.includes('@') ? row.emailDisplay : row.emailNorm;
      if (to.includes('@')) {
        emails.push({ to, locale });
      }
    }
    if (d.slack === true) {
      if (d.slackDelivery === 'channel') {
        const channelId = (d.slackChannelId ?? '').trim();
        if (!SLACK_CHANNEL.test(channelId)) {
          errors.push(`slack_channel_invalid:${row.emailNorm}`);
          continue;
        }
        const mentionUserId = slackMemberIdForAlertDirectoryRow(row, overrides);
        slack.push({ kind: 'channel', channelId, locale, mentionUserId: mentionUserId ?? undefined });
      } else {
        const userId = slackMemberIdForAlertDirectoryRow(row, overrides);
        if (!userId) {
          errors.push(`slack_dm_missing_user:${row.emailNorm}`);
          continue;
        }
        slack.push({ kind: 'dm', userId, locale });
      }
    }
  }

  return { emails, slack, errors };
}

function cleanPmDelivery(
  pmDelivery: Record<string, RecipientDelivery> | undefined,
  pmDirectory: AlertDirectoryRow[],
): Record<string, RecipientDelivery> {
  const pmNorms = new Set(pmDirectory.map(row => row.emailNorm));
  const cleaned: Record<string, RecipientDelivery> = {};
  for (const [key, delivery] of Object.entries(pmDelivery ?? {})) {
    const norm = key.trim().toLowerCase();
    if (!norm.includes('@') || !pmNorms.has(norm) || !delivery) {
      continue;
    }
    if (delivery.email === true || delivery.slack === true) {
      cleaned[norm] = delivery;
    }
  }
  return cleaned;
}

function regenerateLegacyFields(
  partnerSlack: SlackTarget[],
  pmTargets: BuiltTargets,
): Pick<AlertConfigFormValue, 'slackChannelIds' | 'slackUserMentionIds' | 'pmEmails' | 'bdEmails'> {
  const channelIds = new Set<string>();
  const mentionIds = new Set<string>();
  for (const target of [...partnerSlack, ...pmTargets.slack]) {
    if (target.kind === 'channel') {
      channelIds.add(target.channelId);
      if (target.mentionUserId) {
        mentionIds.add(target.mentionUserId);
      }
    } else {
      mentionIds.add(target.userId);
    }
  }
  return {
    slackChannelIds: [...channelIds],
    slackUserMentionIds: [...mentionIds],
    pmEmails: [...new Set(pmTargets.emails.map(target => target.to))],
    bdEmails: [],
  };
}

function cleanOverrides(overrides: Record<string, string> | undefined): Record<string, string> {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(overrides ?? {})) {
    const candidate = String(value ?? '')
      .trim()
      .replace(MENTION_WRAPPERS, '');
    if (candidate) {
      cleaned[key] = candidate;
    }
  }
  return cleaned;
}

/**
 * Validates per-recipient delivery against the loaded directories and returns a persisted
 * form value: cleaned delivery maps plus regenerated legacy aggregates. Error codes:
 * `recipient_delivery_required`, `reminder_schedule_required`, `validation_mode_needs_recipient`,
 * `no_alert_targets`, `slack_channel_invalid:<email>`, `slack_dm_missing_user:<email>`,
 * `pm_slack_dm_missing_user:<email>`.
 */
export function finalizeAlertConfigForPersist(value: AlertConfigFormValue, directories: AlertDirectories): FinalizeAlertConfigResult {
  const { partnerDirectory, pmDirectory } = directories;
  const defaultLocale = parseAlertLocale(value.locale);

  // The backend requires reminder_timezone + reminder_local_hour on every alert_config it receives,
  // so block submit (rather than 422) when alerts are on but the schedule pair is missing.
  if (value.alertsEnabled !== false && (!value.reminderTimezone?.trim() || value.reminderLocalHour == null)) {
    return { ok: false, error: 'reminder_schedule_required' };
  }

  // An explicit delivery map — even with every toggle off — is a deliberate opt-out and must be
  // preserved as-is; only a never-configured (empty) map falls back to seeding every partner contact.
  let recipientDelivery = value.recipientDelivery ?? {};
  if (Object.keys(recipientDelivery).length === 0) {
    if (!partnerDirectory.length) {
      return { ok: false, error: 'recipient_delivery_required' };
    }
    const seeded: Record<string, RecipientDelivery> = {};
    for (const row of partnerDirectory) {
      seeded[row.emailNorm] = { locale: defaultLocale };
    }
    recipientDelivery = seeded;
  }

  if (value.validationMode === 'everyone' && selectedRecipients(recipientDelivery).length === 0) {
    return { ok: false, error: 'validation_mode_needs_recipient' };
  }

  const partnerTargets = buildTargetsFromDeliveryMap(recipientDelivery, partnerDirectory, value.slackUserIdOverrides, defaultLocale);
  if (partnerTargets.errors.length) {
    return { ok: false, error: partnerTargets.errors.slice(0, 5).join('; ') };
  }

  const cleanedPm = cleanPmDelivery(value.pmRecipientDelivery, pmDirectory);
  const pmTargets = buildTargetsFromDeliveryMap(cleanedPm, pmDirectory, value.slackUserIdOverrides, defaultLocale);
  if (pmTargets.errors.length) {
    const remapped = pmTargets.errors.map(error => (error.startsWith('slack_dm_missing_user:') ? `pm_${error}` : error));
    return { ok: false, error: remapped.slice(0, 5).join('; ') };
  }

  const hasAnyTarget =
    partnerTargets.emails.length > 0 || partnerTargets.slack.length > 0 || pmTargets.emails.length > 0 || pmTargets.slack.length > 0;
  if (value.alertsEnabled !== false && !hasAnyTarget) {
    return { ok: false, error: 'no_alert_targets' };
  }

  return {
    ok: true,
    value: {
      ...value,
      recipientDelivery,
      pmRecipientDelivery: cleanedPm,
      slackUserIdOverrides: cleanOverrides(value.slackUserIdOverrides),
      ...regenerateLegacyFields(partnerTargets.slack, pmTargets),
    },
  };
}
