import {
  CartAdjustmentPrice,
  CartAdjustmentPriceCalculation,
  CartAdjustmentPriceCalculationFinal,
  CartAdjustmentPriceData,
  CartAdjustmentPriceOperation,
  CartAdjustmentPriceWithOperation,
  CartAdjustmentPriceWithOperationData,
} from '@fz-original/app/shared/cart/models/cart-adjustment-price.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { computeManualUnitPrice } from '@fz-original/app/shared/utils/cart-manual-price.util';
import { fixedDecimals } from '@fz-original/app/shared/utils/number.util';

export function signedAdjustmentTotal(adjustment: CartAdjustmentPrice | CartAdjustmentPriceData): Money | null {
  const total = adjustment.total;
  if (total == null) {
    return null;
  }
  const operation = (adjustment as CartAdjustmentPriceWithOperation | CartAdjustmentPriceWithOperationData).operation;
  const sign = operation === CartAdjustmentPriceOperation.SUBTRACT ? -1 : 1;
  return new Money(sign * total.amount, total.currency);
}

export function signedAdjustmentOverTotal(adjustment: CartAdjustmentPrice, total: Money): Money | null {
  if (adjustment.calculation === CartAdjustmentPriceCalculationFinal.FINAL) {
    return null;
  }
  const isSubtract = adjustment.operation === CartAdjustmentPriceOperation.SUBTRACT;
  let amount = adjustment.amount;
  if (adjustment.calculation === CartAdjustmentPriceCalculation.PERCENTAGE) {
    amount = fixedDecimals((total.amount * adjustment.amount) / 100, 2);
    if (isSubtract) {
      amount = Math.min(amount, total.amount);
    }
  } else if (isSubtract && amount > total.amount) {
    return null;
  }
  return signedAdjustmentTotal({ ...adjustment, total: new Money(amount, total.currency) });
}

/**
 * The unit price a line price entry gives over `catalogUnitPrice`: a percentage or a fixed amount re-applied as it was
 * entered, rounded as a manual price, or the `final` amount as it was set. Never below 0.
 */
export function unitPriceWithAdjustment(adjustment: CartAdjustmentPrice, catalogUnitPrice: Money): Money {
  if (adjustment.calculation === CartAdjustmentPriceCalculationFinal.FINAL) {
    return new Money(adjustment.amount, catalogUnitPrice.currency);
  }
  const unitPrice = computeManualUnitPrice(catalogUnitPrice, adjustment);
  return unitPrice.amount < 0 ? new Money(0, unitPrice.currency) : unitPrice;
}

export function totalWithAdjustment(total: Money, adjustment: CartAdjustmentPrice | null | undefined): Money {
  const signedAdjustment = adjustment ? signedAdjustmentOverTotal(adjustment, total) : null;
  if (signedAdjustment === null) {
    return total;
  }
  return new Money(fixedDecimals(total.amount + signedAdjustment.amount, 3), total.currency);
}

export function adjustmentsEqual(modifiedAdjustment: CartAdjustmentPrice | null, originalAdjustment: CartAdjustmentPrice | null): boolean {
  if (modifiedAdjustment === null && originalAdjustment === null) return true;
  if (modifiedAdjustment === null || originalAdjustment === null) return false;
  if (modifiedAdjustment.calculation !== originalAdjustment.calculation) return false;
  const operationMatters = modifiedAdjustment.calculation !== CartAdjustmentPriceCalculationFinal.FINAL;
  const operationsEqual =
    !operationMatters ||
    (modifiedAdjustment as CartAdjustmentPriceWithOperation).operation ===
      (originalAdjustment as CartAdjustmentPriceWithOperation).operation;
  return (
    modifiedAdjustment.amount === originalAdjustment.amount &&
    operationsEqual &&
    (modifiedAdjustment.concept ?? '') === (originalAdjustment.concept ?? '')
  );
}

export function isAdjustmentLocallyValid(adjustment: CartAdjustmentPrice | null | undefined): boolean {
  if (!adjustment || adjustment.amount === undefined) {
    return true;
  }
  if (adjustment.calculation === CartAdjustmentPriceCalculation.PERCENTAGE) {
    return adjustment.amount >= 0 && adjustment.amount <= 100;
  }
  return true;
}
