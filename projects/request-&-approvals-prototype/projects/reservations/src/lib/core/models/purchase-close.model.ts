export interface PurchaseCloseEvaluationApi {
  availability_timestamp?: number | null;
}

export interface PurchaseCloseEvaluation {
  readonly availabilityDate: Date;
}

export interface PurchaseCloseQuery {
  readonly hoursFromCurrentDay: number;
  readonly timezone?: string;
}
