import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { TicketSummary } from '@fz-original/app/modules/cancellation/models/ticket-summary.model';
import { ValidationMethod } from '@fz-original/app/modules/event-settings/models/validation-section.enum';
import { ValidationStatus } from '@fz-original/app/modules/validation/enums/validation-status.enum';
import { PaymentNote } from '@fz-original/app/shared/models/order/payment-note.model';
import { User } from '@fz-original/app/shared/models/user/user.model';

import { BookingAnswer } from '../booking-questions/booking-answer.model';
import { BookingQuestion } from '../booking-questions/booking-question.model';
import { Cart } from '../cart/cart.model';
import { Journey } from '../journey/journey.model';
import { Money } from '../money.model';
import { type OrderPendingModification } from '../order-pending-modification/order-pending-modification.model';
import { AccessTicket } from './access-ticket.model';
import { CatalogPlan } from './catalog-plan.model';
import { EntitlementsInfo } from './entitlements-info.model';
import { OrderUserCancellationRecord } from './order-cancellation-record.model';
import { OrderChannelType } from './order-channel-type.model';
import { OrderNote } from './order-note.model';
import { OrderTaxes } from './order-taxes.model';
import { ReimbursementType } from './reimbursement-type.enum';

export type OrderId = number;

export class Order {
  accessTickets?: Map<string, AccessTicket>;
  assignedSeatsIds?: Array<{ seatsIds: number[]; ticketId: number }>;
  allowedReimbursementTypes?: ReimbursementType[];
  allowsPartialCancellation?: boolean;
  allowSplitPack?: boolean;
  bookingAnswers?: BookingAnswer[];
  bookingQuestions?: BookingQuestion[];
  bundleDiscount?: Money;
  cart?: Cart;
  catalogPlan?: CatalogPlan;
  channelId?: string;
  channelType?: OrderChannelType;
  coverImageUrl?: string;
  createdAt?: string;
  entitlementsInfo?: EntitlementsInfo;
  externalId?: string;
  externalOrderCode?: string;
  externalOrderId?: string;
  groupedOrders?: number[];
  groupMemberCount?: number;
  groupMembers?: Order[];
  hasAssetBasedBooking?: boolean;
  hasDeposit?: boolean;
  hasPartySummary?: boolean;
  hasShopsEntitlement?: boolean;
  journey?: Journey;
  id?: number;
  isFlexibleBundlePrimary?: boolean;
  isMainGroupOrder?: boolean | null = null;
  loyaltyPoints?: number | null;
  mainOrderId?: number;
  note?: OrderNote;
  orderGroupId?: number;
  paymentCardNumberLast4Digits?: string;
  paymentGateway?: string;
  paymentMethod?: PaymentType;
  paymentNote?: PaymentNote;
  pendingModification: OrderPendingModification | null = null;
  placeId?: number;
  planId?: number;
  planName?: string;
  planProviderName: string | null = null;
  products?: Map<string, AccessTicket>;
  purchaseUrn?: string;
  externalReservationId?: string;
  originChannelId?: string;
  reservationChannelId?: string;
  reservationId?: string;
  reservationLocator?: string;
  servingTimesBySessionId?: ReadonlyMap<number, string>;
  sessionSelectorType?: string;
  sourceRescheduleOrderId?: number;
  status?: string;
  targetRescheduleOrderIds?: number[];
  taxes?: OrderTaxes[];
  termsAndConditionsQrImage?: string;
  ticketPrinter?: string;
  ticketsAndProducts?: Map<string, AccessTicket>;
  ticketSizeType?: string;
  ticketsSummaries?: TicketSummary[];
  userCancellationRecords?: OrderUserCancellationRecord[];
  user?: User;
  validationMethod: ValidationMethod | null = null;

  get effectivePlanId(): number | undefined {
    return this.catalogPlan?.id ?? this.planId;
  }

  get effectivePlanName(): string | undefined {
    return this.catalogPlan?.name ?? this.planName;
  }

  constructor(data: Partial<Order> = {}) {
    Object.assign(this, data);
  }

  clone(): Order {
    return new Order({
      accessTickets: new Map(this.accessTickets),
      assignedSeatsIds: this.assignedSeatsIds ? [...this.assignedSeatsIds] : undefined,
      bundleDiscount: this.bundleDiscount,
      id: this.id,
      catalogPlan: this.catalogPlan ? { ...this.catalogPlan } : undefined,
      entitlementsInfo: this.entitlementsInfo ? { ...this.entitlementsInfo } : undefined,
      externalId: this.externalId,
      externalOrderCode: this.externalOrderCode,
      externalOrderId: this.externalOrderId,
      groupedOrders: this.groupedOrders ? [...this.groupedOrders] : undefined,
      groupMemberCount: this.groupMemberCount,
      groupMembers: this.groupMembers ? this.groupMembers.map(member => member.clone()) : undefined,
      hasDeposit: this.hasDeposit,
      hasPartySummary: this.hasPartySummary,
      hasShopsEntitlement: this.hasShopsEntitlement,
      mainOrderId: this.mainOrderId,
      isFlexibleBundlePrimary: this.isFlexibleBundlePrimary,
      isMainGroupOrder: this.isMainGroupOrder ?? null,
      orderGroupId: this.orderGroupId,
      loyaltyPoints: this.loyaltyPoints,
      cart: this.cart?.clone(),
      termsAndConditionsQrImage: this.termsAndConditionsQrImage,
      placeId: this.placeId,
      planId: this.planId,
      planName: this.planName,
      planProviderName: this.planProviderName,
      products: new Map(this.products),
      purchaseUrn: this.purchaseUrn,
      coverImageUrl: this.coverImageUrl,
      ticketsAndProducts: new Map(this.ticketsAndProducts),
      ticketPrinter: this.ticketPrinter,
      ticketSizeType: this.ticketSizeType,
      channelId: this.channelId,
      channelType: this.channelType,
      allowSplitPack: this.allowSplitPack,
      paymentGateway: this.paymentGateway,
      paymentMethod: this.paymentMethod,
      paymentCardNumberLast4Digits: this.paymentCardNumberLast4Digits,
      bookingQuestions: this.bookingQuestions,
      bookingAnswers: this.bookingAnswers,
      allowsPartialCancellation: this.allowsPartialCancellation,
      status: this.status,
      externalReservationId: this.externalReservationId,
      journey: this.journey,
      originChannelId: this.originChannelId,
      reservationId: this.reservationId,
      reservationLocator: this.reservationLocator,
      reservationChannelId: this.reservationChannelId,
      createdAt: this.createdAt,
      note: this.note,
      paymentNote: this.paymentNote,
      pendingModification: this.pendingModification ? { ...this.pendingModification } : null,
      servingTimesBySessionId: this.servingTimesBySessionId ? new Map(this.servingTimesBySessionId) : undefined,
      sessionSelectorType: this.sessionSelectorType,
      sourceRescheduleOrderId: this.sourceRescheduleOrderId,
      targetRescheduleOrderIds: this.targetRescheduleOrderIds ? [...this.targetRescheduleOrderIds] : undefined,
      taxes: this.taxes,
      ticketsSummaries: this.ticketsSummaries,
      userCancellationRecords: this.userCancellationRecords,
      allowedReimbursementTypes: this.allowedReimbursementTypes,
      user: this.user,
      validationMethod: this.validationMethod,
    });
  }

  filterAccessTicketsByTicketIdAndCode(ticketId: number, code?: string): Order {
    const accessTickets = this.accessTickets ?? new Map<string, AccessTicket>();
    const ticketsAndProducts = this.ticketsAndProducts ?? new Map<string, AccessTicket>();
    const products = this.products ?? new Map<string, AccessTicket>();
    accessTickets.forEach((accessTicket, key) => {
      if (accessTicket.ticketId !== ticketId) {
        accessTickets.delete(key);
        ticketsAndProducts.delete(key);
        products.delete(key);
      }
      if (code && code !== accessTicket.code) {
        accessTickets.delete(key);
        ticketsAndProducts.delete(key);
        products.delete(key);
      }
    });
    return this;
  }

  filterAccessTicketsByKeys(keys: Set<string>): Order {
    const accessTickets = this.accessTickets ?? new Map<string, AccessTicket>();
    const ticketsAndProducts = this.ticketsAndProducts ?? new Map<string, AccessTicket>();
    const products = this.products ?? new Map<string, AccessTicket>();
    for (const key of [...accessTickets.keys()]) {
      if (!keys.has(key)) {
        accessTickets.delete(key);
        ticketsAndProducts.delete(key);
        products.delete(key);
      }
    }
    return this;
  }

  filterAccessTicketsCancelled(): Order {
    const accessTickets = this.accessTickets ?? new Map<string, AccessTicket>();
    const ticketsAndProducts = this.ticketsAndProducts ?? new Map<string, AccessTicket>();
    const products = this.products ?? new Map<string, AccessTicket>();
    accessTickets.forEach((accessTicket, key) => {
      if (accessTicket.status === ValidationStatus.CANCELLED) {
        accessTickets.delete(key);
        ticketsAndProducts.delete(key);
        products.delete(key);
      }
    });
    return this;
  }

  filterAccessTicketsWithoutCode(): Order {
    const accessTickets = this.accessTickets ?? new Map<string, AccessTicket>();
    const ticketsAndProducts = this.ticketsAndProducts ?? new Map<string, AccessTicket>();
    const products = this.products ?? new Map<string, AccessTicket>();
    accessTickets.forEach((accessTicket, key) => {
      if (!accessTicket.code) {
        accessTickets.delete(key);
        ticketsAndProducts.delete(key);
        products.delete(key);
      }
    });
    return this;
  }

  hasTransactionFeeAccessTickets(): boolean {
    return Array.from(this.accessTickets?.values() ?? []).some(accessTicket => accessTicket.isTransactionFee === true);
  }

  withoutTransactionFeeAccessTickets(): Order {
    if (!this.hasTransactionFeeAccessTickets()) {
      return this;
    }
    const copy: Order = Object.assign(Object.create(Object.getPrototypeOf(this) as object) as Order, this);
    copy.accessTickets = Order.#withoutTransactionFees(this.accessTickets);
    copy.ticketsAndProducts = Order.#withoutTransactionFees(this.ticketsAndProducts);
    copy.products = Order.#withoutTransactionFees(this.products);
    return copy;
  }

  static #withoutTransactionFees(accessTickets?: Map<string, AccessTicket>): Map<string, AccessTicket> | undefined {
    if (!accessTickets) {
      return accessTickets;
    }
    return new Map(Array.from(accessTickets.entries()).filter(([, accessTicket]) => !accessTicket.isTransactionFee));
  }
}
