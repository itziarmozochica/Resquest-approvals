export enum InformationRequestReviewAction {
  Approve = 'approve',
  Reject = 'reject',
  RequestChanges = 'request-changes',
}

export type InformationRequestSendBackAction = InformationRequestReviewAction.Reject | InformationRequestReviewAction.RequestChanges;

export enum InformationRequestReviewErrorKey {
  Conflict = 'conflict',
  Failed = 'failed',
  NotFound = 'notFound',
  ReasonRequired = 'reasonRequired',
  ReasonTooLong = 'reasonTooLong',
}

export enum InformationRequestEvaluationLoadErrorKey {
  Forbidden = 'forbidden',
  LoadFailed = 'loadFailed',
  NotFound = 'notFound',
}

export const informationRequestReviewReasonMaxLength = 2000;

export interface InformationRequestReviewPayload {
  reason: string;
}

export const informationRequestReviewErrorKeyByCode: Readonly<Record<string, InformationRequestReviewErrorKey>> = {
  illegal_status_transition: InformationRequestReviewErrorKey.Conflict,
  information_request_not_found: InformationRequestReviewErrorKey.NotFound,
  reason_required: InformationRequestReviewErrorKey.ReasonRequired,
  reason_too_long: InformationRequestReviewErrorKey.ReasonTooLong,
};

export const informationRequestEvaluationLoadErrorKeyByCode: Readonly<Record<string, InformationRequestEvaluationLoadErrorKey>> = {
  403: InformationRequestEvaluationLoadErrorKey.Forbidden,
  404: InformationRequestEvaluationLoadErrorKey.NotFound,
  information_request_not_found: InformationRequestEvaluationLoadErrorKey.NotFound,
};

export const informationRequestReviewI18nKey: Readonly<Record<InformationRequestReviewAction, string>> = {
  [InformationRequestReviewAction.Approve]: 'approve',
  [InformationRequestReviewAction.Reject]: 'reject',
  [InformationRequestReviewAction.RequestChanges]: 'requestChanges',
};
