import { PaperTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { MUSEUM_OF_ILLUSIONS_NEW_DELHI, PARADOX_MUSEUM_INDIA } from '@fz-original/app/shared/services/partner/partner.service';

export const PRIMAVERA_SOUND_PORTO_2025_ID = 313017;
export const zebraPartnersWithReceipt: readonly number[] = [PARADOX_MUSEUM_INDIA, MUSEUM_OF_ILLUSIONS_NEW_DELHI];
export const zplPurgeStoredJobs = '^XA^JUS^XZ';
export const zplPaperTypeCommand: Readonly<Record<PaperTypeEnum, string>> = {
  [PaperTypeEnum.basic_paper]: '~TA000',
  [PaperTypeEnum.pre_printed_paper]: '~TA036',
};

export interface ZplLabels {
  orderId: string;
  providedBy: string;
  purchasedAt: string;
  termsHeader: string;
  ticketId: string;
}

export interface ZplReceiptLabels {
  address: string;
  email: string;
  phone: string;
  taxBase: string;
  taxBreakdown: string;
  title: string;
  total: string;
}

export interface ZebraZplSetup {
  hasCutter: boolean;
  paperType: PaperTypeEnum;
}

export interface ZplLabelContext {
  labels: ZplLabels;
  partnerId: number | undefined;
}

export interface ZplTicketLayout {
  isLast: boolean;
  isUnifiedTicket: boolean;
}
