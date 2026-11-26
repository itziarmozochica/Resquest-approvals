import { Injectable } from '@angular/core';

import { DurationUnit } from './models/duration-unit.enum';
import { ReleaseFrequency } from './models/release-frequency.enum';
import { ReminderFrequency } from './models/reminder-frequency.enum';
import {
  DurationValue,
  TicketDeliverySettings,
  TicketDeliverySettingsMainPlan,
  TicketDeliverySettingsRule,
  TicketReleaseSettings,
  TicketReminderSettings,
} from './models/ticket-delivery-settings.model';

interface ApiDurationValue {
  amount: number;
  unit: DurationUnit;
}

interface ApiMainPlan {
  first_active_time_slot: string | null;
  id: number;
  name: string;
  timezone: string;
}

interface ApiTicketDeliverySettings {
  id: string;
  is_default: boolean;
  main_plans: ApiMainPlan[];
  name: string;
}

interface ApiTicketReleaseSettings {
  duration_before_time_slot: ApiDurationValue | null;
  group_across_plans: boolean;
  group_by_plan: boolean;
  is_seating_blocked: boolean;
  release_at: string | null;
  release_frequency: ReleaseFrequency;
}

interface ApiTicketReminderSettings {
  duration_before_time_slot: ApiDurationValue;
  group_across_plans: boolean;
  group_by_plan: boolean;
  reminder_frequency: ReminderFrequency;
}

export interface ApiTicketDeliverySettingsRule {
  ticket_delivery_settings: ApiTicketDeliverySettings;
  ticket_release_settings: ApiTicketReleaseSettings | null;
  ticket_reminder_settings: ApiTicketReminderSettings | null;
}

export interface ApiTicketDeliverySettingsResponse {
  data: ApiTicketDeliverySettingsRule[];
  error: { code: number; message: string } | null;
}

export interface ApiCreateTicketDeliverySettingsResponse {
  data: { id: string };
  error: { code: number; message: string } | null;
}

@Injectable({
  providedIn: 'root',
})
export class TicketDeliverySettingsAdapter {
  fromApi(response: ApiTicketDeliverySettingsResponse): TicketDeliverySettingsRule[] {
    return (response.data ?? []).map(rule => this.#mapRule(rule));
  }

  #mapDeliverySettings(settings: ApiTicketDeliverySettings): TicketDeliverySettings {
    return {
      id: settings.id,
      isDefault: settings.is_default,
      mainPlans: settings.main_plans.map(plan => this.#mapMainPlan(plan)),
      name: settings.name,
    };
  }

  #mapDuration(duration: ApiDurationValue): DurationValue {
    return {
      amount: duration.amount,
      unit: duration.unit,
    };
  }

  #mapMainPlan(plan: ApiMainPlan): TicketDeliverySettingsMainPlan {
    return {
      firstActiveTimeSlot: plan.first_active_time_slot,
      id: plan.id,
      name: plan.name,
      timezone: plan.timezone,
    };
  }

  #mapReleaseSettings(settings: ApiTicketReleaseSettings): TicketReleaseSettings {
    return {
      durationBeforeTimeSlot: settings.duration_before_time_slot ? this.#mapDuration(settings.duration_before_time_slot) : null,
      groupAcrossPlans: settings.group_across_plans,
      groupByPlan: settings.group_by_plan,
      isSeatingBlocked: settings.is_seating_blocked,
      releaseAt: settings.release_at,
      releaseFrequency: settings.release_frequency,
    };
  }

  #mapReminderSettings(settings: ApiTicketReminderSettings): TicketReminderSettings {
    return {
      durationBeforeTimeSlot: this.#mapDuration(settings.duration_before_time_slot),
      groupAcrossPlans: settings.group_across_plans,
      groupByPlan: settings.group_by_plan,
      reminderFrequency: settings.reminder_frequency,
    };
  }

  #mapRule(rule: ApiTicketDeliverySettingsRule): TicketDeliverySettingsRule {
    return {
      ticketDeliverySettings: this.#mapDeliverySettings(rule.ticket_delivery_settings),
      ticketReleaseSettings: rule.ticket_release_settings ? this.#mapReleaseSettings(rule.ticket_release_settings) : null,
      ticketReminderSettings: rule.ticket_reminder_settings ? this.#mapReminderSettings(rule.ticket_reminder_settings) : null,
    };
  }
}
