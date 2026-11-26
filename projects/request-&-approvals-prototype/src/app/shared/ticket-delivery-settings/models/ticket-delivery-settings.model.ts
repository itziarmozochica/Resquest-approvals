import { DurationUnit } from './duration-unit.enum';
import { ReleaseFrequency } from './release-frequency.enum';
import { ReminderFrequency } from './reminder-frequency.enum';

export interface DurationValue {
  amount: number;
  unit: DurationUnit;
}

export interface TicketDeliverySettingsMainPlan {
  firstActiveTimeSlot: string | null;
  id: number;
  name: string;
  timezone: string;
}

export interface TicketDeliverySettings {
  id: string;
  isDefault: boolean;
  mainPlans: TicketDeliverySettingsMainPlan[];
  name: string;
}

export interface TicketReleaseSettings {
  durationBeforeTimeSlot: DurationValue | null;
  groupAcrossPlans: boolean;
  groupByPlan: boolean;
  isSeatingBlocked: boolean;
  releaseAt: string | null;
  releaseFrequency: ReleaseFrequency;
}

export interface TicketReminderSettings {
  durationBeforeTimeSlot: DurationValue;
  groupAcrossPlans: boolean;
  groupByPlan: boolean;
  reminderFrequency: ReminderFrequency;
}

export interface TicketDeliverySettingsRule {
  ticketDeliverySettings: TicketDeliverySettings;
  ticketReleaseSettings: TicketReleaseSettings | null;
  ticketReminderSettings: TicketReminderSettings | null;
}

export interface CreateTicketReleaseRequest {
  ticket_delivery_settings: {
    main_plan_ids: number[];
    name: string;
  };
  ticket_release_settings: {
    duration_before_time_slot: { amount: number; unit: string } | null;
    is_seating_blocked: boolean;
    release_at: string | null;
    release_frequency: ReleaseFrequency;
  };
}

export interface UpsertTicketReleaseRequest {
  ticket_delivery_settings: {
    name: string;
  };
  ticket_release_settings: {
    duration_before_time_slot: { amount: number; unit: string } | null;
    is_seating_blocked: boolean;
    release_at: string | null;
    release_frequency: ReleaseFrequency;
  };
}

export interface CreateTicketReminderRequest {
  ticket_delivery_settings: {
    main_plan_ids: number[];
    name: string;
  };
  ticket_reminder_settings: {
    duration_before_time_slot: { amount: number; unit: string };
    group_across_plans: boolean;
    group_by_plan: boolean;
    reminder_frequency: ReminderFrequency;
  };
}

export interface UpsertTicketReminderRequest {
  ticket_delivery_settings: {
    main_plan_ids: number[];
    name: string;
  };
  ticket_reminder_settings: {
    duration_before_time_slot: { amount: number; unit: string };
    group_across_plans: boolean;
    group_by_plan: boolean;
    reminder_frequency: ReminderFrequency;
  };
}

export interface PatchTicketReleaseGroupingRequest {
  ticket_delivery_settings: {
    main_plan_ids: number[];
  };
  ticket_release_settings: {
    group_across_plans: boolean;
    group_by_plan: boolean;
  };
}

export type PreviewNotificationType = 'RELEASE' | 'REMINDER';

export interface PreviewNotificationRequest {
  notification_type: PreviewNotificationType;
  recipient_email: string;
  user_email: string;
}
