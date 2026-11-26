import {
  AlertConfigFormValue,
  AlertConfigPayload,
  createDefaultAlertConfig,
  DEFAULT_ALERT_CONFIG,
  hasRecipientPermission,
  RecipientDelivery,
  RecipientDeliveryPayload,
} from '../models/alert-config.model';
import { isFeverEmail } from './fever-email.util';

export function toAlertConfigPayload(value: AlertConfigFormValue | null): AlertConfigPayload | undefined {
  if (!value) {
    return undefined;
  }
  const payload: AlertConfigPayload = {};
  if (value.alertsEnabled !== DEFAULT_ALERT_CONFIG.alertsEnabled) {
    payload.alerts_enabled = value.alertsEnabled;
  }
  if (value.pmEmails.length > 0) {
    payload.pm_emails = [...value.pmEmails];
  }
  if (value.bdEmails.length > 0) {
    payload.bd_emails = [...value.bdEmails];
  }
  if (value.slackChannelIds.length > 0) {
    payload.slack_channel_ids = [...value.slackChannelIds];
  }
  if (value.slackUserMentionIds.length > 0) {
    payload.slack_user_mention_ids = [...value.slackUserMentionIds];
  }
  const recipientDelivery = toDeliveryMapPayload(value.recipientDelivery);
  if (recipientDelivery) {
    payload.recipient_delivery = recipientDelivery;
  }
  const pmRecipientDelivery = toDeliveryMapPayload(value.pmRecipientDelivery);
  if (pmRecipientDelivery) {
    payload.pm_recipient_delivery = pmRecipientDelivery;
  }
  if (value.slackUserIdOverrides && Object.keys(value.slackUserIdOverrides).length > 0) {
    payload.slack_user_id_overrides = { ...value.slackUserIdOverrides };
  }
  if (value.locale !== DEFAULT_ALERT_CONFIG.locale) {
    payload.locale = value.locale;
  }
  if (value.frequency !== DEFAULT_ALERT_CONFIG.frequency) {
    payload.frequency = value.frequency;
  }
  if (value.frequency === 'custom' && value.customReminderIntervalDays != null) {
    payload.custom_reminder_interval_days = value.customReminderIntervalDays;
  }
  if (value.bypassDigest) {
    payload.bypass_digest = true;
  }
  const hasScheduleOverride =
    value.reminderTimezone !== DEFAULT_ALERT_CONFIG.reminderTimezone || value.reminderLocalHour !== DEFAULT_ALERT_CONFIG.reminderLocalHour;
  const hasValidationModeOverride = value.validationMode !== DEFAULT_ALERT_CONFIG.validationMode;
  if (Object.keys(payload).length === 0 && !hasScheduleOverride && !hasValidationModeOverride) {
    return undefined;
  }
  // The backend requires reminder_timezone + reminder_local_hour on every alert_config it receives
  // (even at their default values). Send the pair whenever we emit a config, or it rejects with invalid_alert_config.
  if (value.reminderTimezone) {
    payload.reminder_timezone = value.reminderTimezone;
  }
  if (value.reminderLocalHour != null) {
    payload.reminder_local_hour = value.reminderLocalHour;
  }
  payload.validation_mode = value.validationMode;
  return payload;
}

export function fromAlertConfigPayload(payload: AlertConfigPayload | null | undefined): AlertConfigFormValue {
  if (!payload) {
    return createDefaultAlertConfig();
  }
  return {
    alertsEnabled: payload.alerts_enabled ?? DEFAULT_ALERT_CONFIG.alertsEnabled,
    pmEmails: payload.pm_emails ? [...payload.pm_emails] : [],
    bdEmails: payload.bd_emails ? [...payload.bd_emails] : [],
    slackChannelIds: payload.slack_channel_ids ? [...payload.slack_channel_ids] : [],
    slackUserMentionIds: payload.slack_user_mention_ids ? [...payload.slack_user_mention_ids] : [],
    recipientDelivery: fromDeliveryMapPayload(payload.recipient_delivery),
    pmRecipientDelivery: fromDeliveryMapPayload(payload.pm_recipient_delivery),
    slackUserIdOverrides: payload.slack_user_id_overrides ? { ...payload.slack_user_id_overrides } : {},
    locale: payload.locale ?? DEFAULT_ALERT_CONFIG.locale,
    frequency: payload.frequency ?? DEFAULT_ALERT_CONFIG.frequency,
    customReminderIntervalDays: payload.custom_reminder_interval_days ?? null,
    reminderTimezone: payload.reminder_timezone ?? DEFAULT_ALERT_CONFIG.reminderTimezone,
    reminderLocalHour: payload.reminder_local_hour ?? DEFAULT_ALERT_CONFIG.reminderLocalHour,
    bypassDigest: payload.bypass_digest ?? DEFAULT_ALERT_CONFIG.bypassDigest,
    validationMode: payload.validation_mode ?? DEFAULT_ALERT_CONFIG.validationMode,
  };
}

export function withRecipientPermissions(
  delivery: Record<string, RecipientDelivery>,
  isHubPermissionsEnabled: boolean,
): Record<string, RecipientDelivery> {
  const out: Record<string, RecipientDelivery> = {};
  for (const [emailNorm, entry] of Object.entries(delivery)) {
    const { permission, ...rest } = entry;
    out[emailNorm] =
      isHubPermissionsEnabled && !isFeverEmail(emailNorm) ? { ...rest, permission: hasRecipientPermission({ ...rest, permission }) } : rest;
  }
  return out;
}

function fromDeliveryMapPayload(map: Record<string, RecipientDeliveryPayload> | undefined): Record<string, RecipientDelivery> {
  const out: Record<string, RecipientDelivery> = {};
  for (const [emailNorm, entry] of Object.entries(map ?? {})) {
    const delivery: RecipientDelivery = {};
    if (entry.email != null) {
      delivery.email = entry.email;
    }
    if (entry.slack != null) {
      delivery.slack = entry.slack;
    }
    if (entry.permission != null) {
      delivery.permission = entry.permission;
    }
    if (entry.slack_delivery != null) {
      delivery.slackDelivery = entry.slack_delivery;
    }
    if (entry.slack_channel_id != null) {
      delivery.slackChannelId = entry.slack_channel_id;
    }
    if (entry.locale != null) {
      delivery.locale = entry.locale;
    }
    out[emailNorm] = delivery;
  }
  return out;
}

function toDeliveryMapPayload(map: Record<string, RecipientDelivery> | undefined): Record<string, RecipientDeliveryPayload> | undefined {
  if (!map || Object.keys(map).length === 0) {
    return undefined;
  }
  const out: Record<string, RecipientDeliveryPayload> = {};
  for (const [emailNorm, delivery] of Object.entries(map)) {
    const entry: RecipientDeliveryPayload = {};
    if (delivery.email !== undefined) {
      entry.email = delivery.email;
    }
    if (delivery.slack !== undefined) {
      entry.slack = delivery.slack;
    }
    if (delivery.permission !== undefined) {
      entry.permission = delivery.permission;
    }
    if (delivery.slackDelivery !== undefined) {
      entry.slack_delivery = delivery.slackDelivery;
    }
    if (delivery.slackChannelId !== undefined) {
      entry.slack_channel_id = delivery.slackChannelId;
    }
    if (delivery.locale !== undefined) {
      entry.locale = delivery.locale;
    }
    out[emailNorm] = entry;
  }
  return out;
}
