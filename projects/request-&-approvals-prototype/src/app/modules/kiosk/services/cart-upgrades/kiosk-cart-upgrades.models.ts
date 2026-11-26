import { CartSessionTypeUpgradeBaseData } from '../../../../core/tracking/core/events/cart-session-type-upgrade.model';
import { Cart } from '../../../../shared/models/cart/cart.model';

export interface CartSessionTypeUpgradesApiResponse {
  data: { upgrades: CartSessionTypeUpgradeResponse[] } | null;
  error: { code: number; message: string } | null;
}

export interface CartSessionTypeUpgradeResponse {
  add_on_options: CartSessionTypeUpgradeAddOnOptionResponse[];
  currency: string;
  description: string;
  id: number;
  image_url: string | null;
  options: CartSessionTypeUpgradeOptionResponse[];
  target_main_plan_id: number | null;
  title: string;
  upgrade_scheduling_days: number;
}

export interface CartSessionTypeUpgradeOptionResponse {
  price_delta_per_ticket: string;
  source_session_id: number;
  target_original_price_per_ticket: string;
  target_session_id: number;
}

export interface CartSessionTypeUpgradeAddOnOptionResponse {
  price_delta_per_ticket: string;
  source_cart_item_id: number;
  target_original_price_per_ticket: string;
  target_session_id: number;
}

export interface ApplySessionTypeUpgradeApiResponse {
  data: object | null;
  error: { code: number; message: string } | null;
}

export interface ApplySessionTypeUpgradeRequest {
  source_session_id: number;
  target_session_id: number;
  units: number;
}

export interface CartSessionTypeUpgrade {
  addOnOptions: CartSessionTypeUpgradeOption[];
  currency: string;
  description: string;
  id: number;
  imageUrl: string | null;
  options: CartSessionTypeUpgradeOption[];
  targetMainPlanId: number | null;
  title: string;
  upgradeSchedulingDays: number;
}

export interface CartSessionTypeUpgradeOption {
  priceDeltaPerTicket: number;
  sourceSessionId: number;
  targetOriginalPricePerTicket: number;
  targetSessionId: number;
}

export interface UpgradeCartSession {
  sessionId: number;
  units: number;
}

export type CartUpgradeTriggerOutcome =
  | {
      apply_requests_count: number;
      cart: Cart;
      kind: 'add-applied';
      targetMainPlanId: number | null;
      tracking: CartSessionTypeUpgradeBaseData;
    }
  | { kind: 'add-failed'; tracking: CartSessionTypeUpgradeBaseData }
  | { kind: 'skip'; tracking: CartSessionTypeUpgradeBaseData }
  | { kind: 'close'; tracking: CartSessionTypeUpgradeBaseData }
  | { kind: 'not-shown' };

export function adaptCartSessionTypeUpgrades(responses: CartSessionTypeUpgradeResponse[]): CartSessionTypeUpgrade[] {
  return responses.map(adaptCartSessionTypeUpgrade);
}

function adaptCartSessionTypeUpgrade(r: CartSessionTypeUpgradeResponse): CartSessionTypeUpgrade {
  return {
    addOnOptions: r.add_on_options.map(adaptCartSessionTypeUpgradeAddOnOption),
    currency: r.currency,
    description: r.description,
    id: r.id,
    imageUrl: r.image_url ?? null,
    options: r.options.map(adaptCartSessionTypeUpgradeOption),
    targetMainPlanId: r.target_main_plan_id ?? null,
    title: r.title,
    upgradeSchedulingDays: r.upgrade_scheduling_days,
  };
}

function adaptCartSessionTypeUpgradeOption(o: CartSessionTypeUpgradeOptionResponse): CartSessionTypeUpgradeOption {
  return {
    priceDeltaPerTicket: Number(o.price_delta_per_ticket),
    sourceSessionId: o.source_session_id,
    targetOriginalPricePerTicket: Number(o.target_original_price_per_ticket),
    targetSessionId: o.target_session_id,
  };
}

function adaptCartSessionTypeUpgradeAddOnOption(o: CartSessionTypeUpgradeAddOnOptionResponse): CartSessionTypeUpgradeOption {
  return {
    priceDeltaPerTicket: Number(o.price_delta_per_ticket),
    sourceSessionId: o.source_cart_item_id,
    targetOriginalPricePerTicket: Number(o.target_original_price_per_ticket),
    targetSessionId: o.target_session_id,
  };
}

export function pickRenderableUpgrade(
  upgrades: CartSessionTypeUpgrade[],
  cartSessions: UpgradeCartSession[],
): CartSessionTypeUpgrade | null {
  for (const upgrade of upgrades) {
    const usable = usableOptions(upgrade.options, cartSessions);
    if (usable.length > 0) {
      return { ...upgrade, addOnOptions: usableOptions(upgrade.addOnOptions, cartSessions), options: usable };
    }
  }
  return null;
}

function usableOptions(options: CartSessionTypeUpgradeOption[], cartSessions: UpgradeCartSession[]): CartSessionTypeUpgradeOption[] {
  return options.filter(opt => isUsableOption(opt) && countForOption(opt, cartSessions) > 0);
}

function isUsableOption(opt: CartSessionTypeUpgradeOption): boolean {
  return Number.isFinite(opt.priceDeltaPerTicket) && Number.isFinite(opt.targetOriginalPricePerTicket);
}

function allOptionsOf(upgrade: CartSessionTypeUpgrade): CartSessionTypeUpgradeOption[] {
  return [...upgrade.options, ...upgrade.addOnOptions];
}

export function computeTotalDelta(upgrade: CartSessionTypeUpgrade, cartSessions: UpgradeCartSession[]): number {
  return allOptionsOf(upgrade).reduce((sum, opt) => sum + opt.priceDeltaPerTicket * countForOption(opt, cartSessions), 0);
}

export function computeTotalUnits(upgrade: CartSessionTypeUpgrade, cartSessions: UpgradeCartSession[]): number {
  return upgrade.options.reduce((sum, opt) => sum + countForOption(opt, cartSessions), 0);
}

function countForOption(opt: CartSessionTypeUpgradeOption, cartSessions: UpgradeCartSession[]): number {
  return cartSessions.filter(s => s.sessionId === opt.sourceSessionId).reduce((sum, s) => sum + s.units, 0);
}

export function buildApplyUpgradeRequests(
  upgrade: CartSessionTypeUpgrade,
  cartSessions: UpgradeCartSession[],
): ApplySessionTypeUpgradeRequest[] {
  return allOptionsOf(upgrade)
    .map(opt => ({
      source_session_id: opt.sourceSessionId,
      target_session_id: opt.targetSessionId,
      units: countForOption(opt, cartSessions),
    }))
    .filter(r => r.units > 0);
}
