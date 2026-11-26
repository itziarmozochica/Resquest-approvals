const UNKNOWN_CODE_HISTORY_ERROR_TYPE = 'unknown_error';

const CODE_HISTORY_ERROR_TYPES: ReadonlySet<string> = new Set([
  'code_not_found',
  'ticket_not_found',
  'code_belongs_to_another_partner',
  'code_not_valid_for_venue',
  'code_not_valid_for_plan',
  'code_for_different_session_type',
  'code_cancelled',
  'code_already_used',
  'exit_not_allowed',
  'denied_time_window',
  'invalid_access_day',
  'invalid_day_of_week',
  'invalid_time_for_day_of_week',
  'outside_access_time',
  'outside_validation_window',
  'time_window_incompatible_with_session',
  'entry_limit_reached',
  'daily_entry_limit_reached',
  'reentry_too_soon',
  'max_uses_exceeded',
  'code_not_active_yet',
  'code_expired',
  'entry_pass_deactivated',
  'call_to_action_required',
  'multiple_rules_failed',
  'multiple_profiles_available',
  'code_not_authorized_for_profile',
  'profile_not_found',
  'invalid_profiles_for_setup',
  'profiles_required',
  'setup_not_found',
  'order_has_more_codes',
  'invalid_partial_validation',
  'cluster_not_scheduled',
  'cluster_wrong_time',
  'cluster_all_validated',
  'cluster_target_session_invalid',
  'cluster_ticket_already_on_target_session',
  'cluster_ticket_already_validated',
  'cluster_ticket_cancelled',
  'cluster_ticket_belongs_to_another_partner',
  'cluster_entitlement_not_eligible',
  'cluster_capacity_full',
  'cluster_schedule_window_expired',
  'cluster_reschedule_conflict',
  'cluster_reschedule_not_allowed',
  'access_control_unavailable',
  'validation_timeout',
  UNKNOWN_CODE_HISTORY_ERROR_TYPE,
]);

function getKnownCodeHistoryErrorType(errorType: string | null): string {
  return errorType !== null && CODE_HISTORY_ERROR_TYPES.has(errorType) ? errorType : UNKNOWN_CODE_HISTORY_ERROR_TYPE;
}

export function getCodeHistoryErrorTitleKey(errorType: string | null): string {
  return `validateTicketsNew.ticketHistory.errors.${getKnownCodeHistoryErrorType(errorType)}.title`;
}

export function getCodeHistoryErrorDescriptionKey(errorType: string | null): string {
  return `validateTicketsNew.ticketHistory.errors.${getKnownCodeHistoryErrorType(errorType)}.description`;
}
