export type ReminderFrequency = 'every_day' | 'every_2_days' | 'every_3_days' | 'every_week' | 'custom';

export type AlertLocale = 'en' | 'es' | 'fr' | 'it' | 'de';

export type SlackDelivery = 'individual' | 'channel';

export type ApprovalValidationMode = 'only_one' | 'everyone';

const VALIDATION_MODE_UNSUPPORTED_TYPES: ReadonlySet<string> = new Set([
  'marketing_copy',
  'marketing_landings',
  'crm_campaign',
  'fever_event',
  'event',
]);

export function selectedRecipients(recipientDelivery: Record<string, RecipientDelivery> | undefined): string[] {
  return Object.entries(recipientDelivery ?? {})
    .filter(([email, delivery]) => email.trim().length > 0 && (delivery.email === true || delivery.slack === true))
    .map(([email]) => email.trim().toLowerCase())
    .sort();
}

export function hasRecipientPermission(delivery: RecipientDelivery | undefined): boolean {
  return delivery?.permission === true || delivery?.email === true || delivery?.slack === true;
}

export function validationModeNeedsRecipient(value: AlertConfigFormValue | null | undefined): boolean {
  return value?.validationMode === 'everyone' && selectedRecipients(value.recipientDelivery).length === 0;
}

export function supportsValidationMode(approvalType: string | null | undefined): boolean {
  return !!approvalType && !VALIDATION_MODE_UNSUPPORTED_TYPES.has(approvalType);
}

/** Per-recipient delivery toggles, keyed by normalized email in the delivery maps. */
export interface RecipientDelivery {
  email?: boolean;
  slack?: boolean;
  permission?: boolean;
  slackDelivery?: SlackDelivery;
  slackChannelId?: string;
  locale?: AlertLocale;
}

export interface AlertConfigFormValue {
  alertsEnabled: boolean;
  pmEmails: string[];
  bdEmails: string[];
  slackChannelIds: string[];
  slackUserMentionIds: string[];
  recipientDelivery?: Record<string, RecipientDelivery>;
  pmRecipientDelivery?: Record<string, RecipientDelivery>;
  slackUserIdOverrides?: Record<string, string>;
  locale: AlertLocale;
  frequency: ReminderFrequency;
  customReminderIntervalDays: number | null;
  reminderTimezone: string | null;
  reminderLocalHour: number | null;
  bypassDigest: boolean;
  validationMode: ApprovalValidationMode;
}

export interface RecipientDeliveryPayload {
  email?: boolean;
  slack?: boolean;
  permission?: boolean;
  slack_delivery?: SlackDelivery;
  slack_channel_id?: string;
  locale?: AlertLocale;
}

export interface AlertConfigPayload {
  alerts_enabled?: boolean;
  pm_emails?: string[];
  bd_emails?: string[];
  slack_channel_ids?: string[];
  slack_user_mention_ids?: string[];
  recipient_delivery?: Record<string, RecipientDeliveryPayload>;
  pm_recipient_delivery?: Record<string, RecipientDeliveryPayload>;
  slack_user_id_overrides?: Record<string, string>;
  locale?: AlertLocale;
  frequency?: ReminderFrequency;
  custom_reminder_interval_days?: number;
  reminder_timezone?: string;
  reminder_local_hour?: number;
  bypass_digest?: boolean;
  validation_mode?: ApprovalValidationMode;
}

export const DEFAULT_ALERT_CONFIG: AlertConfigFormValue = {
  alertsEnabled: true,
  pmEmails: [],
  bdEmails: [],
  slackChannelIds: [],
  slackUserMentionIds: [],
  recipientDelivery: {},
  pmRecipientDelivery: {},
  slackUserIdOverrides: {},
  locale: 'en',
  frequency: 'every_3_days',
  customReminderIntervalDays: null,
  reminderTimezone: 'Europe/Berlin',
  reminderLocalHour: 9,
  bypassDigest: false,
  validationMode: 'only_one',
};

export function createDefaultAlertConfig(): AlertConfigFormValue {
  return {
    ...DEFAULT_ALERT_CONFIG,
    pmEmails: [],
    bdEmails: [],
    slackChannelIds: [],
    slackUserMentionIds: [],
    recipientDelivery: {},
    pmRecipientDelivery: {},
    slackUserIdOverrides: {},
  };
}
