export interface LocalTerminalTransactionDto {
  amount: number;
  currencyCode: string;
  transactionNumber: string;
}

export interface LocalTerminalCheckoutResultDto {
  status: number;
  data?: { transaction?: LocalTerminalTransactionDto | null } | null;
  errorCondition?: string | null;
  refusalReason?: string | null;
}
