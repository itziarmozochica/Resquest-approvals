import { BaseErrorResponse } from '../../../shared/models/base-response';

/**
 * The shared error shape plus the HTTP status that produced it. fever2 answers this endpoint with
 * distinct statuses for "not yours" and "gone", and the composed `code` alone cannot tell them
 * apart without hardcoding fever2's status-code arithmetic here.
 */
export interface AgreementSigningError extends BaseErrorResponse {
  status: number | null;
}
