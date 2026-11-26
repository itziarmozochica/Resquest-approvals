import { EfstaZReport } from './efsta-z-report.model';

export type ComplianceSubprocess =
  | 'registration'
  | 'refund'
  | 'open-day'
  | 'x-report'
  | 'z-report'
  | 'ping-nav'
  | 'print-list'
  | 'usb-on'
  | 'usb-off'
  | 'health-check'
  | 'opening-balance'
  | 'fiscal-state'
  | 'persist-transaction'
  | 'reprint';

export interface ComplianceLogData {
  business_process: 'compliance';
  country: string;
  subprocess: ComplianceSubprocess;
  partnerId?: number;
  onsiteSetupId?: string;
  durationMs?: number;
  isPrinterWorking?: boolean;
  printerStatus?: {
    coverOpen: boolean;
    dayOpen: boolean | null;
    paperEnd: boolean;
    paperNearEnd: boolean;
    warnings: readonly string[];
  } | null;
  errorCode?: string;
  httpStatus?: number;
  details?: string;
  orderId?: number;
  cancelledOrderId?: number;
  fiscalNumber?: string;
  originalFiscalNumber?: string;
  efrResponseCode?: string;
  attempt?: 'first' | 'retry';
  userAction?: 'retry' | 'abort';
  zReport?: EfstaZReport;
}

export type ComplianceLogContext = Partial<ComplianceLogData>;

const defaultComplianceCountry = 'UNDEFINED';

export function buildComplianceLog(
  subprocess: ComplianceSubprocess,
  context: Partial<ComplianceLogData>,
  extra?: Partial<ComplianceLogData>,
): ComplianceLogData {
  return {
    business_process: 'compliance',
    subprocess,
    ...context,
    country: context.country || defaultComplianceCountry,
    ...extra,
  };
}
