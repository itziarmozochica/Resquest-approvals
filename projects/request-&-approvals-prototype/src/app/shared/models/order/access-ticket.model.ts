import { ValidationStatus } from '../../../modules/validation/enums/validation-status.enum';
import { TransferIntent } from '../cart/transfer-intent.model';
import { Money } from '../money.model';
import { CheckInDetails } from './check-in-details.model';
import { CodeType } from './code-type.model';
import { FiscalLine } from './fiscal-line.model';
import { TicketReleaseCondition } from './release-condition.model';
import { Spot } from './spot.model';
import { TicketTimeGranularity } from './ticket-time-granularity.enum';

export interface AccessTicket {
  codeType: CodeType | null;
  id: string;
  nominativeValues: Array<{ label: string; value: string }>;
  sessionAddress: string;
  sessionIsoCountryCode: string;
  sessionName: string;
  sessionStartsAt: string;
  sessionTicketReceiptLabel: string;
  showInvitationLabel: boolean;
  status: ValidationStatus;
  surchargePerTicket: Money;
  ticketId: number;
  timeGranularity: TicketTimeGranularity | null;
  total: Money;
  unitPrice: Money;
  activationDate?: string;
  checkInDetails?: CheckInDetails | null;
  code?: string;
  discountApplied?: Money | null;
  expiryDate?: string;
  fiscalLines?: FiscalLine[] | null;
  groupId?: number | null;
  hasReleaseConditions?: boolean;
  holderName?: string | null;
  imageUrl?: string;
  invitationId?: number | null;
  isInvitation?: boolean;
  isTransactionFee?: boolean;
  isValidated?: boolean;
  loyaltyTotalPrice?: number | null;
  loyaltyUnitPrice?: number | null;
  productType?: string;
  redeemedAt?: string;
  releaseCondition?: TicketReleaseCondition;
  seat?: string;
  seatId?: number;
  sessionLabel?: string;
  sessionOpenGatesAt?: string | null;
  sessionPlaceName?: string;
  spot?: Spot;
  surchargeTaxRate?: number;
  taxRate?: number;
}

export interface AccessTicketWithCode extends AccessTicket {
  code: string;
  codeType: CodeType;
}

export interface AccessTicketWithCodeAndTransferInfo extends AccessTicketWithCode {
  transferInfo: {
    isResale: boolean;
    transferIntent: TransferIntent | null;
  };
}

export function getDiscountApplied(accessTicket: AccessTicket): Money {
  return new Money(accessTicket.discountApplied?.amount ?? 0, accessTicket.total?.currency ?? '');
}
