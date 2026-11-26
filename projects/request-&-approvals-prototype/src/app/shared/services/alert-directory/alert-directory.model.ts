export interface AlertDirectoryRowApiDto {
  email_norm: string;
  email_display: string;
  slack_user_id: string | null;
  hub_user_id?: string | null;
}

/** A contact row returned by the alert-directory endpoint (partner or PM side). */
export interface AlertDirectoryRow {
  emailNorm: string;
  emailDisplay: string;
  slackUserId: string | null;
  hubUserId?: string | null;
}

export interface AlertDirectoryApiData {
  partner_entries: AlertDirectoryRowApiDto[];
  pm_entries: AlertDirectoryRowApiDto[];
  hub_permissions_enabled?: boolean;
}

export interface AlertDirectory {
  partnerEntries: AlertDirectoryRow[];
  pmEntries: AlertDirectoryRow[];
  isHubPermissionsEnabled: boolean;
}

export function mapAlertDirectoryRowDto(dto: AlertDirectoryRowApiDto): AlertDirectoryRow {
  return {
    emailNorm: dto.email_norm,
    emailDisplay: dto.email_display,
    slackUserId: dto.slack_user_id ?? null,
    hubUserId: dto.hub_user_id ?? null,
  };
}

export interface FeverContactSearchApiData {
  results: AlertDirectoryRowApiDto[];
  total: number;
}

export interface FeverContactSearchResult {
  rows: AlertDirectoryRow[];
  total: number;
}
