export type HuRefundType = 'void' | 'return';

export type HuVoidReasonCodeValue = 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8';

export type HuReturnReasonCodeValue = 'V1' | 'V2' | 'V3';

export type HuReasonCodeValue = HuVoidReasonCodeValue | HuReturnReasonCodeValue;

export interface HuVoidReasonCode {
  readonly code: HuReasonCodeValue;
  readonly labelKey: string;
}

export const HU_VOID_REASON_CODES: readonly HuVoidReasonCode[] = [
  { code: 'S1', labelKey: 'boxOffice.fiscal.huRefund.reasons.S1' },
  { code: 'S2', labelKey: 'boxOffice.fiscal.huRefund.reasons.S2' },
  { code: 'S3', labelKey: 'boxOffice.fiscal.huRefund.reasons.S3' },
  { code: 'S4', labelKey: 'boxOffice.fiscal.huRefund.reasons.S4' },
  { code: 'S5', labelKey: 'boxOffice.fiscal.huRefund.reasons.S5' },
  { code: 'S6', labelKey: 'boxOffice.fiscal.huRefund.reasons.S6' },
  { code: 'S7', labelKey: 'boxOffice.fiscal.huRefund.reasons.S7' },
  { code: 'S8', labelKey: 'boxOffice.fiscal.huRefund.reasons.S8' },
  { code: 'S0', labelKey: 'boxOffice.fiscal.huRefund.reasons.S0' },
];

export const HU_RETURN_REASON_CODES: readonly HuVoidReasonCode[] = [
  { code: 'V1', labelKey: 'boxOffice.fiscal.huRefund.reasons.V1' },
  { code: 'V2', labelKey: 'boxOffice.fiscal.huRefund.reasons.V2' },
  { code: 'V3', labelKey: 'boxOffice.fiscal.huRefund.reasons.V3' },
];

export const HU_REASON_CODES: readonly HuVoidReasonCode[] = [...HU_VOID_REASON_CODES, ...HU_RETURN_REASON_CODES];

export interface HuFiscalRefundData {
  readonly reasonCode: HuReasonCodeValue;
  readonly customerName: string;
  readonly customerTaxId: string;
  readonly customerAddress: string;
  readonly customerZip: string;
  readonly customerCity: string;
}

export interface HuFiscalRefundPopupData {
  readonly refundType: HuRefundType;
  readonly prefilledCustomerName?: string;
}
