import { Money } from '../../models/money.model';

export enum CartAdjustmentPriceCalculation {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
}

export enum CartAdjustmentPriceCalculationFinal {
  FINAL = 'final',
}

export enum CartAdjustmentPriceOperation {
  ADD = 'add',
  SUBTRACT = 'subtract',
}

interface BaseCartAdjustmentPrice {
  id?: string;
  amount: number;
  concept: string;
  couponCode?: string;
  total?: Money;
  rounded?: CartAdjustmentRounding;
}

export interface CartAdjustmentPriceWithOperation extends BaseCartAdjustmentPrice {
  calculation: CartAdjustmentPriceCalculation;
  operation: CartAdjustmentPriceOperation;
}

export interface CartAdjustmentPriceFinal extends BaseCartAdjustmentPrice {
  calculation: CartAdjustmentPriceCalculationFinal;
  operation?: CartAdjustmentPriceOperation;
}

export type CartAdjustmentPrice = CartAdjustmentPriceWithOperation | CartAdjustmentPriceFinal;

// API response type (snake_case for backend compatibility)
interface BaseCartAdjustmentPriceData {
  id?: string;
  amount: number;
  concept: string;
  coupon_code?: string;
  total?: Money;
  rounded?: CartAdjustmentRoundingData;
}

export interface CartAdjustmentPriceWithOperationData extends BaseCartAdjustmentPriceData {
  calculation: CartAdjustmentPriceCalculation;
  operation: CartAdjustmentPriceOperation;
}

interface CartAdjustmentRoundingData {
  amount: Money;
}

interface CartAdjustmentRounding {
  amount: Money;
}

interface CartAdjustmentPriceFinalData extends BaseCartAdjustmentPriceData {
  calculation: CartAdjustmentPriceCalculationFinal;
}

export type CartAdjustmentPriceData = CartAdjustmentPriceWithOperationData | CartAdjustmentPriceFinalData;
