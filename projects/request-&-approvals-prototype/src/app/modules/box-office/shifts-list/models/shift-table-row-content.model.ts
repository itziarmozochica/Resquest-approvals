import { Money } from '../../../../shared/models/money.model';

export interface ShiftTableRowContent {
  id: string;
  userName: string;
  userEmail: string;
  shiftStart: Date;
  shiftEnd?: Date;
  onsiteSetupName: string;
  cashRegisterNames: string;
  ticketsSold: number;
  cardAmount: Money;
  cashAmount: Money;
  qrCodeAmount: Money;
  icCardAmount: Money;
  otherAmount: Money;
  totalAmount: Money;
  hasCashIncidence: boolean;
  comment?: string;
  shiftSurveySatisfaction: number | null;
}
