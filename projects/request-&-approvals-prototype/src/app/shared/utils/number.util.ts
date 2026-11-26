import { Decimal } from 'decimal.js';

import { Money } from '../models/money.model';

export function isNumber(value: unknown): boolean {
  return typeof value === 'number';
}

export function isNonZeroNumber(value: number | null | undefined): value is number {
  return value != null && value !== 0;
}

export function fixedDecimals(value: number, numberOfDecimals: number): number {
  const factor: number = Math.pow(10, numberOfDecimals);
  return Math.round(value * factor) / factor;
}

export function sumMoneys(...moneys: Money[]): Money {
  if (moneys.length < 2) {
    throw new Error('At least to moneys should be introduced to sum them');
  }
  const totalAmount: number = moneys.reduce((sum: number, money: Money) => sum + money.amount, 0);
  return new Money(fixedDecimals(totalAmount, 3), moneys[0].currency);
}

export function subtractMoneys(...moneys: Money[]): Money {
  if (moneys.length < 2) {
    throw new Error('At least two moneys should be introduced to subtract them');
  }
  // Start with the amount of the first money
  const totalAmount: number = moneys.slice(1).reduce((result: number, money: Money) => result - money.amount, moneys[0].amount);
  return new Money(fixedDecimals(totalAmount, 3), moneys[0].currency);
}

export function fixedDecimalsRoundHalfEven(value: number, numberOfDecimals: number = 2): number {
  const number = new Decimal(value);
  const quantized = number.toDecimalPlaces(numberOfDecimals, Decimal.ROUND_HALF_EVEN);
  return quantized.toNumber();
}

export function percentageRoundHalfUp(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return new Decimal(numerator).div(denominator).mul(100).toDecimalPlaces(1, Decimal.ROUND_HALF_UP).toNumber();
}

export function coercePositiveNumberOrNull(value: number | null | undefined, maxDecimalPlaces?: number): number | null {
  if (value == null) {
    return null;
  }
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  if (maxDecimalPlaces !== undefined && new Decimal(value).decimalPlaces() > maxDecimalPlaces) {
    return null;
  }
  return value;
}

export function coerceNonNegativeNumberOrNull(value: number | null | undefined, maxDecimalPlaces?: number): number | null {
  if (value == null) {
    return null;
  }
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  if (maxDecimalPlaces !== undefined && new Decimal(value).decimalPlaces() > maxDecimalPlaces) {
    return null;
  }
  return value;
}

export function coercePositiveIntegerOrNull(value: number | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    return null;
  }
  return value;
}

export function parseStrictPositiveIntegerString(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return n;
}
