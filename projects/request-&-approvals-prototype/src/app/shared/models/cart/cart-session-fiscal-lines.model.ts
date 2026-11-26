import { FiscalLine } from '../order/fiscal-line.model';

export interface CartSessionFiscalLines {
  fiscalLines: FiscalLine[] | null | undefined;
  isPack?: boolean;
  sessionId: number;
  total: number;
}
