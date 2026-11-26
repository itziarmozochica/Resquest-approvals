import { MINIMUM_SPLIT_AMOUNT_CENTS } from '@fz-original/app/modules/box-office/shared/constants/split-payment.constants';

import type { CheckoutContext } from '../models/checkout.model';

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Balance still owed, in cents. Centralises the `total - paid` cents math previously duplicated
 * across the checkout config and store so single/split flows share one source of truth.
 */
export function remainingBalanceCents(totalAmount: number, paidAmount: number): number {
  return toCents(totalAmount) - toCents(paidAmount);
}

/**
 * A custom leg amount must be positive, within the remaining balance, and at least the minimum
 * split amount — unless it closes the balance exactly (the last leg may be smaller than the
 * minimum: the cashier must always be able to settle the remainder).
 */
export function isValidCustomLegAmountCents(amountCents: number, remainingCents: number): boolean {
  if (amountCents <= 0 || amountCents > remainingCents) {
    return false;
  }
  return amountCents >= MINIMUM_SPLIT_AMOUNT_CENTS || amountCents === remainingCents;
}

export function maxEqualSplitCount(totalCents: number): number {
  if (totalCents <= 0) {
    return 0;
  }
  return Math.floor(totalCents / MINIMUM_SPLIT_AMOUNT_CENTS);
}

/**
 * Equal share of the remaining balance among the people who still have to pay. The last
 * remaining person absorbs the rounding remainder so the splits always add up to the total.
 */
export function equalSplitAmountCents(remainingCents: number, remainingPeople: number): number {
  if (remainingCents <= 0 || remainingPeople <= 0) {
    return 0;
  }
  if (remainingPeople === 1) {
    return remainingCents;
  }
  return Math.floor(remainingCents / remainingPeople);
}

function isCustomSplitFlow(flowType: CheckoutContext['flowType']): boolean {
  return flowType === 'customSplit';
}

function isSplitFlow(flowType: CheckoutContext['flowType']): boolean {
  return flowType === 'splitEqually' || flowType === 'customSplit' || flowType === 'customAmount';
}

/** Single source of truth for the amount of the current payment leg (store, FSM guards, cash capture). */
export function resolveCurrentLegAmountCents(context: CheckoutContext): number {
  const remaining = Math.max(remainingBalanceCents(context.cartTotal?.amount ?? 0, context.paidAmount?.amount ?? 0), 0);
  if (!isSplitFlow(context.flowType)) {
    return remaining;
  }
  if (context.payRemaining) {
    return remaining;
  }
  if (context.splitAmountOverride !== null) {
    return toCents(context.splitAmountOverride.amount);
  }
  if (isCustomSplitFlow(context.flowType)) {
    return 0;
  }
  const remainingPeople = context.splitCount - context.currentSplitIndex;
  return equalSplitAmountCents(remaining, remainingPeople);
}
