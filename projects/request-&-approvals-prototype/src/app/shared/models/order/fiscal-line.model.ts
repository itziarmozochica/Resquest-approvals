import { Money } from '../money.model';

export interface FiscalLine {
  isBookingFee: boolean;
  pricePerUnit: Money;
  productType: string | null;
  quantity: number;
  sessionTypeId: number | null;
  taxRate: number | null;
  text: string;
}

export interface FiscalLineDTO {
  is_booking_fee: boolean;
  price_per_unit: { amount: number; currency: string };
  product_type?: string | null;
  quantity: number;
  session_type_id: number | null;
  tax_rate: number | null;
  text: string;
}

export function mapFiscalLinesFromApi(fiscalLines: FiscalLineDTO[] | null | undefined): FiscalLine[] | null | undefined {
  if (fiscalLines === undefined) {
    return undefined;
  }
  if (fiscalLines === null) {
    return null;
  }
  return fiscalLines.map(fiscalLine => ({
    isBookingFee: fiscalLine.is_booking_fee,
    pricePerUnit: new Money(fiscalLine.price_per_unit.amount, fiscalLine.price_per_unit.currency),
    productType: fiscalLine.product_type ?? null,
    quantity: fiscalLine.quantity,
    sessionTypeId: fiscalLine.session_type_id,
    taxRate: fiscalLine.tax_rate,
    text: fiscalLine.text,
  }));
}
