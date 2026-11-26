import { TransferIntent, TransferIntentStatus } from '../../../../../models/cart/transfer-intent.model';

const STATUS_PRIORITY: Record<TransferIntentStatus, number> = {
  claimed: 0,
  pending: 1,
  revoked: 2,
};

export function ticketCodeTransferIntent(code: string, transferIntents: TransferIntent[]): TransferIntent | null {
  return (
    [...transferIntents]
      .sort(
        (a, b) =>
          STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .find(transferIntent => transferIntent.codes.some(transferIntentCode => transferIntentCode.code === code)) ?? null
  );
}
