import { TransferTypeEnum } from './transfer-type.enum';

export interface TicketTransfer {
  id: string;
  receivedTicketId: number;
  ticketToTransferId: number;
  transferType: TransferTypeEnum;
  count: number;
  createdAt: string;
}
