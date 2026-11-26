export interface EntitlementReschedulePair {
  target_session_id: number;
  ticket_id: number;
}

export interface EntitlementRescheduleRequest {
  pairs: EntitlementReschedulePair[];
  acknowledge_clash?: boolean;
}

export interface EntitlementRescheduleConflictPair {
  conflicting_session_id: number;
  conflicting_ticket_id: number;
  target_session_id: number;
  ticket_id: number;
}

export interface EntitlementRescheduleClash {
  conflicting_pairs: EntitlementRescheduleConflictPair[];
}
