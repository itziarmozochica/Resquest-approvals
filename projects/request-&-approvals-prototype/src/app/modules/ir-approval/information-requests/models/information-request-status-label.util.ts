import { InformationRequestStatus } from './information-request-status.enum';

export function informationRequestStatusLabelKey(status: InformationRequestStatus): string {
  if (status === InformationRequestStatus.SUBMITTED) {
    return 'informationRequests.status.pendingEvaluation';
  }
  return `informationRequests.status.${status.toLowerCase()}`;
}
