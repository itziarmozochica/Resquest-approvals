import { AutoAppliedPlanDiscountsInfo } from '@fz-original/app/modules/box-office/memberships/models/memberships.model';
import { CartAdjustmentPrice, CartAdjustmentPriceData } from '@fz-original/app/shared/cart/models/cart-adjustment-price.model';
import { StripeKeys } from '@fz-original/environments/environment.model';

import { ValidationStatus } from '../../../modules/validation/enums/validation-status.enum';
import { SeatingProviderEnum } from '../../seating-selector/components/seating-selector/__data__/seating-provider.enum';
import { Money } from '../money.model';
import { CancellationInsurancePartnerShare } from '../order/cancellation-insurance-partner-share.model';
import { FiscalLineDTO } from '../order/fiscal-line.model';
import { ReferencePrice } from '../order/reference-price.model';
import {
  isInScope,
  itemTypesOf,
  resolveCartWideMaxByKey,
  SharedAvailabilityKeyScope,
  SharedAvailabilityRule,
  SharedAvailabilityRuleItemType,
} from '../session-availability/shared-availability-rule.model';
import { SessionType } from '../session-type/session-type.model';
import { CartSessionItemLineRequestBody } from './cart-session-item-line.model';
import {
  CartB2bEmployeeRequestBody,
  CartManualPriceRequestBody,
  CartSessionManualPrice,
  CartSessionManualPriceData,
} from './cart-session-manual-price.model';
import { TicketTransfer } from './cart-ticket-transfer.model';
import { TransferIntent } from './transfer-intent.model';

/** Manual prices travel only with `session_item_lines`; `b2b_employee` is required whenever `manual_prices` is sent. */
interface CartManualPricesPayload {
  b2b_employee?: CartB2bEmployeeRequestBody;
  manual_prices?: CartManualPriceRequestBody[];
}

interface CartSessionItemsPayload extends CartManualPricesPayload {
  session_item_lines?: CartSessionItemLineRequestBody[];
  session_items?: CartSessionItemRequestBody[];
}

interface CreateCartSessionItemLinesPayload extends CartManualPricesPayload {
  session_item_lines: CartSessionItemLineRequestBody[];
  is_real_time_seating?: never;
  session_items?: never;
}

/** The real-time seating flag only travels with `session_items`, where the backend reads the per-item hold token. */
interface CreateCartSessionItemsPayload {
  session_items: CartSessionItemRequestBody[];
  b2b_employee?: never;
  is_real_time_seating?: boolean;
  manual_prices?: never;
  session_item_lines?: never;
}

interface CreateCartRequestBodyBase {
  channel: string;
  bundle_ids?: number[];
  override_capacity?: boolean;
  partner_id?: number;
  reschedule_order_id?: number;
  reschedule_paid_by?: string;
}

interface UpdateCartRequestBodyBase {
  adjustment?: CartAdjustmentPriceData;
  bundle_ids?: number[];
  override_capacity?: boolean;
  seating_map_state?: string;
}

export type CreateCartRequestBody = CreateCartRequestBodyBase & (CreateCartSessionItemLinesPayload | CreateCartSessionItemsPayload);

export type UpdateCartRequestBody = UpdateCartRequestBodyBase & CartSessionItemsPayload;

export interface CartSessionItemRequestBody {
  session_id: number;
  units: number;
  main_plan_id?: number;
  seating_hold_token?: string;
  seats?: { label: string; reference: string }[];
}

export interface CartSessionAdjustmentPriceData {
  total_price_with_override: Money;
  total_price_without_override: Money;
  total_surcharge_with_override: Money;
  total_surcharge_without_override: Money;
}

export interface CartSessionData {
  id: number;
  units: number;
  bundle_discount?: Money | null;
  configured_ticket_price?: Money | null;
  fiscal_lines?: FiscalLineDTO[] | null;
  is_add_on?: boolean;
  is_pack?: boolean;
  is_shop_product?: boolean;
  main_plan_id?: number;
  manual_price?: CartSessionManualPriceData | null;
  override_prices?: CartSessionAdjustmentPriceData | null;
  place_id?: number;
  price?: Money;
  seat_references?: string[];
  seats?: string[];
  session_type?: {
    id: number;
    is_entry_pass?: boolean;
    is_shop_product?: boolean;
    label?: string;
    ticket_receipt_label?: string | null;
  };
  session_type_id?: number;
  source_session_type_id?: number | null;
  start_date?: string;
  surcharge_per_ticket?: Money;
  timezone?: string;
  title?: string;
  title_without_format?: string;
  total_strikethrough_price?: Money | null;
  total_surcharge_per_ticket?: Money;
  unit_price?: Money;
  user_confirmation_messages?: string[] | null;
}

export interface CartSessionAdjustmentPrice {
  totalPriceWithoutOverride: Money;
  totalPriceWithOverride: Money;
  totalSurchargeWithoutOverride: Money;
  totalSurchargeWithOverride: Money;
}

export interface CartSessionPriceCalculation
  extends Pick<CartSession, 'price' | 'surchargePerTicket' | 'totalSurchargePerTicket' | 'total'> {
  currency: keyof StripeKeys | string;
}

export type UnmemberedCartSession = Omit<
  CartSession,
  'clone' | 'getTransfer' | 'hasBeenFullyTransferred' | 'isPackConstituent' | 'orderListKey'
>;

export type GroupRuleViolationKind = 'min' | 'max';

export interface GroupRuleViolation {
  kind: GroupRuleViolationKind;
  required: number;
  selected: number;
  type: string;
  messageOnFailure?: string | null;
  messageOnFailureMin?: string | null;
}

export class CartSession {
  constructor(
    public sessionId: number,
    public units: number = 0,
    public sessionName?: string,
    public sessionStartAt?: string,
    public sessionEndAt?: string,
    public sessionTimezone?: string,
    public unitPrice?: Money | null,
    public price?: Money | null,
    public totalSurchargePerTicket?: Money | null,
    public surchargePerTicket?: Money | null,
    public seats?: string[] | null,
    public userConfirmationMessages?: string[],
    public ticketId?: number,
    public total?: Money | null,
    public accessTicketIds?: string[],
    public status?: ValidationStatus,
    public validatedCount?: number,
    public sessionAddress?: string,
    public sessionAddressId?: number, // TODO rename to venueId
    public sessionAddressCityStandardId?: number,
    public ownerFullName?: string,
    public hasCodes?: boolean,
    public redeemedAt?: string,
    public isGuest?: boolean,
    public transfers?: TicketTransfer[],
    public isExpired?: boolean,
    public createdAt?: string,
    public ownerEmail?: string,
    public sessionType?: SessionType,
    public seatLabels?: string[],
    public overridePrices?: CartSessionAdjustmentPrice,
    public isPack?: boolean,
    public mainPlanId?: number,
    public ownerPhone?: string,
    public sessionNameWithoutFormat?: string,
    public seatingProvider?: SeatingProviderEnum,
    public totalStrikethroughPrice?: Money,
    public autoAppliedPlanDiscountsInfo?: AutoAppliedPlanDiscountsInfo,
    public seatingHoldToken?: string,
    public ticketTransferIntents?: TransferIntent[],
    public sessionOpenGatesAt?: string | null,
    public sessionVenueName?: string,
    public hasSeating?: boolean,
    public ticketUserEmail?: string,
    public seatDisplayLabels?: string[],
    public targetEntitlementSessionTypeId?: number,
    public loyaltyUnitPrice?: number | null,
    public loyaltyTotalPrice?: number | null,
    public accumulatedTransactionFee?: Money | null,
    public referencePrice?: ReferencePrice | null,
  ) {}

  sharedAvailabilityRule?: SharedAvailabilityRule;
  bundleDiscount?: Money | null;
  sourceSessionTypeId?: number | null;
  packConstituentOf?: number;
  packConstituents?: CartSession[];
  /** The catalogue price per ticket, kept after `unitPrice` becomes the manual price. */
  catalogUnitPrice?: Money | null;
  /** When set, `unitPrice` equals `manualPrice.unitPrice`. */
  manualPrice?: CartSessionManualPrice | null;
  /** The staff member cleared a manual price the backend may still hold: the next request sends an explicit null. */
  isManualPriceClearPending?: boolean;
  /**
   * The line price an order line was sold with, as it was entered (GET order `manual_price`). Read only: a modification
   * re-applies it over the catalog price and never sends it back as a `manualPrice`.
   */
  orderManualPrice?: CartAdjustmentPrice | null;
  cancellationInsurancePartnerShare?: CancellationInsurancePartnerShare | null;
  /** The price the real-time map reported for each seat, in the order of `seats`. Set only on real-time lines. */
  seatPrices?: Money[];

  clone(): CartSession {
    const cloned = new CartSession(
      this.sessionId,
      this.units,
      this.sessionName,
      this.sessionStartAt,
      this.sessionEndAt,
      this.sessionTimezone,
      this.unitPrice,
      this.price,
      this.totalSurchargePerTicket,
      this.surchargePerTicket,
      this.seats,
      this.userConfirmationMessages,
      this.ticketId,
      this.total,
      this.accessTicketIds,
      this.status,
      this.validatedCount,
      this.sessionAddress,
      this.sessionAddressId,
      this.sessionAddressCityStandardId,
      this.ownerFullName,
      this.hasCodes,
      this.redeemedAt,
      this.isGuest,
      this.transfers,
      this.isExpired,
      this.createdAt,
      this.ownerEmail,
      this.sessionType,
      this.seatLabels,
      this.overridePrices,
      this.isPack,
      this.mainPlanId,
      this.ownerPhone,
      this.sessionNameWithoutFormat,
      this.seatingProvider,
      this.totalStrikethroughPrice,
      this.autoAppliedPlanDiscountsInfo,
      this.seatingHoldToken,
      this.ticketTransferIntents,
      this.sessionOpenGatesAt,
      this.sessionVenueName,
      this.hasSeating,
      this.ticketUserEmail,
      this.seatDisplayLabels,
      this.targetEntitlementSessionTypeId,
      this.loyaltyUnitPrice,
      this.loyaltyTotalPrice,
      this.accumulatedTransactionFee,
      this.referencePrice,
    );
    if (this.sharedAvailabilityRule !== undefined) {
      cloned.sharedAvailabilityRule = this.sharedAvailabilityRule;
    }
    if (this.packConstituentOf !== undefined) {
      cloned.packConstituentOf = this.packConstituentOf;
    }
    if (this.packConstituents !== undefined) {
      cloned.packConstituents = this.packConstituents.map(constituent => constituent.clone());
    }
    if (this.catalogUnitPrice !== undefined) {
      cloned.catalogUnitPrice = this.catalogUnitPrice;
    }
    if (this.bundleDiscount !== undefined) {
      cloned.bundleDiscount = this.bundleDiscount;
    }
    if (this.sourceSessionTypeId !== undefined) {
      cloned.sourceSessionTypeId = this.sourceSessionTypeId;
    }
    if (this.manualPrice !== undefined) {
      cloned.manualPrice = this.manualPrice;
    }
    if (this.isManualPriceClearPending !== undefined) {
      cloned.isManualPriceClearPending = this.isManualPriceClearPending;
    }
    if (this.orderManualPrice !== undefined) {
      cloned.orderManualPrice = this.orderManualPrice;
    }
    if (this.cancellationInsurancePartnerShare !== undefined) {
      cloned.cancellationInsurancePartnerShare = this.cancellationInsurancePartnerShare;
    }
    if (this.seatPrices !== undefined) {
      cloned.seatPrices = this.seatPrices;
    }
    return cloned;
  }

  static getGroupRuleViolations(cartSessions: CartSession[], scope?: SharedAvailabilityKeyScope): GroupRuleViolation[] {
    const groups = new Map<string, { itemType: SharedAvailabilityRuleItemType; memberSessionIds: Set<number>; selected: number }>();
    const cartWideMaxByKey = resolveCartWideMaxByKey(itemTypesOf(cartSessions.map(cartSession => cartSession.sharedAvailabilityRule)));

    cartSessions.forEach(cartSession => {
      const rule = cartSession.sharedAvailabilityRule;
      if (!rule) {
        return;
      }
      rule.itemTypesSharingAvailabilityAllOf.forEach(itemType => {
        if (!isInScope(itemType, scope)) {
          return;
        }
        let group = groups.get(itemType.type);
        if (!group) {
          group = { itemType, memberSessionIds: new Set<number>(), selected: 0 };
          groups.set(itemType.type, group);
        }
        group.memberSessionIds.add(cartSession.sessionId);
        if (cartSession.units > 0) {
          group.selected += cartSession.units;
        }
      });
    });

    const candidates: { membersKey: string; violation: GroupRuleViolation }[] = [];
    groups.forEach(({ itemType, memberSessionIds, selected }, type) => {
      const membersKey = Array.from(memberSessionIds)
        .sort((a, b) => a - b)
        .join(',');
      const maximumUnits = itemType.isCartWide === true ? (cartWideMaxByKey.get(type) ?? itemType.max) : itemType.max;
      const violation = { messageOnFailure: itemType.messageOnFailure, messageOnFailureMin: itemType.messageOnFailureMin, selected, type };
      if (itemType.min > 1 && selected > 0 && selected < itemType.min) {
        candidates.push({ membersKey, violation: { ...violation, kind: 'min', required: itemType.min } });
      }
      if (maximumUnits > 0 && selected > maximumUnits) {
        candidates.push({ membersKey, violation: { ...violation, kind: 'max', required: maximumUnits } });
      }
    });

    return CartSession.#keepMostRestrictivePerMembers(candidates);
  }

  getTransfer(): TicketTransfer | undefined {
    return this.transfers?.find(transfer => transfer.receivedTicketId === this.ticketId);
  }

  hasBeenFullyTransferred(): boolean {
    return this.units === 0 && (this.transfers?.length ?? 0) > 0;
  }

  get isPackConstituent(): boolean {
    return this.packConstituentOf !== undefined;
  }

  get orderListKey(): string {
    return `${this.packConstituentOf ?? this.ticketId}-${this.sessionId}`;
  }

  static #isMoreRestrictive(candidate: GroupRuleViolation, current: GroupRuleViolation): boolean {
    return candidate.kind === 'min' ? candidate.required > current.required : candidate.required < current.required;
  }

  static #keepMostRestrictivePerMembers(candidates: { membersKey: string; violation: GroupRuleViolation }[]): GroupRuleViolation[] {
    const mostRestrictive = new Map<string, GroupRuleViolation>();
    candidates.forEach(candidate => {
      const key = `${candidate.violation.kind}|${candidate.membersKey}`;
      const current = mostRestrictive.get(key);
      if (!current || CartSession.#isMoreRestrictive(candidate.violation, current)) {
        mostRestrictive.set(key, candidate.violation);
      }
    });
    return Array.from(mostRestrictive.values());
  }
}
