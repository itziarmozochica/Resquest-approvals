const conflictStatus = 409;
const goneStatus = 410;

/** fever2's ORDER_AGREEMENT_UPDATE_INCOMPATIBLE. The not-signable refusal is a 410 too, so the status alone is not enough. */
const agreementVersionSupersededCode = 128030014;

/** fever2's ORDER_AGREEMENT_UPDATE_LOCKED. Every other reopen conflict is a 409 too, so the status alone is not enough. */
const ticketAlreadyValidatedCode = 128030012;

export function isAgreementVersionSupersededError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('status' in error) || !('code' in error)) {
    return false;
  }
  return error.status === goneStatus && error.code === agreementVersionSupersededCode;
}

export function isTicketAlreadyValidatedError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('status' in error) || !('code' in error)) {
    return false;
  }
  return error.status === conflictStatus && error.code === ticketAlreadyValidatedCode;
}
