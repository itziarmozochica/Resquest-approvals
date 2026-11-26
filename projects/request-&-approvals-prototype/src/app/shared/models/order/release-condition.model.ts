export const agreementSignedReleaseCondition = 'AGREEMENT_SIGNED';

export interface TicketReleaseConditionAction {
  isEnabled: boolean;
}

export interface TicketReleaseCondition {
  action: TicketReleaseConditionAction | null;
  type: string;
}
