export const enum BookStatusEnum {
  InProgress = 'IN_PROGRESS',
  Completed = 'COMPLETED',
}

export interface BookResultResponse {
  fiscal_user_message?: string;
  order_id?: number;
  order_ids?: number[];
}

export interface BookResult {
  status: BookStatusEnum;
  fiscalUserMessage?: string;
  orderId?: number;
  orderIds?: number[];
  transactionId?: string;
}
