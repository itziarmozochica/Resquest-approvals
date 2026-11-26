export interface PartnerAlertSettingsApiDto {
  reminder_timezone: string;
  updated_at?: string | null;
}

export interface PartnerAlertSettings {
  reminderTimezone: string;
}

export function mapPartnerAlertSettingsDto(dto: PartnerAlertSettingsApiDto): PartnerAlertSettings {
  return {
    reminderTimezone: dto.reminder_timezone,
  };
}
