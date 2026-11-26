export interface TransferIntent {
  codes: TransferIntentCode[];
  count: number;
  createdAt: string;
  id: number;
  onlyClaimableBy: TransferIntentClaimer | null;
  status: TransferIntentStatus;
  ticketId: number;
  ticketTransferId: number;
  userId: number;
}

export interface TransferIntentCode {
  code: string;
  id: number;
}

export interface TransferIntentClaimer {
  email: string;
}

export type TransferIntentStatus = 'pending' | 'claimed' | 'revoked';
