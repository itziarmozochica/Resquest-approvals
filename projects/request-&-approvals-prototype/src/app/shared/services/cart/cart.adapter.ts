import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { CartAdjustmentPriceWithOperationData } from '../../cart/models/cart-adjustment-price.model';
import { BaseErrorResponse, BaseResponse } from '../../models/base-response';
import { CartSessionItemLine, CartSessionItemLineData } from '../../models/cart/cart-session-item-line.model';
import { CartSession, CartSessionAdjustmentPrice, CartSessionData } from '../../models/cart/cart-session.model';
import { Cart, CartData, CartDataProductServingTime, PRODUCTS_GROUP_KEY } from '../../models/cart/cart.model';
import { Coupon } from '../../models/cart/coupon.model';
import { Channel } from '../../models/channel/channel.model';
import { Money } from '../../models/money.model';
import { SessionType } from '../../models/session-type/session-type.model';
import { PackedSession, PackedSessionDTO, SessionPack, SessionPackDTO } from '../../models/session/session-pack.model';
import { toCartSessionManualPrice } from '../../utils/cart-manual-price.util';
import { CartUtil } from '../../utils/cart.util';
import { DepositAdapter } from '../deposit/deposit.adapter';

@Injectable({
  providedIn: 'root',
})
export class CartAdapter implements AdapterInterface<BaseResponse<Cart>> {
  constructor(private readonly depositAdapter: DepositAdapter) {}

  adaptSessionPack(sessionPackDTO: SessionPackDTO): SessionPack {
    const adaptPack = (packedSessionDTO: PackedSessionDTO): PackedSession => {
      return {
        id: packedSessionDTO.id,
        label: packedSessionDTO.label,
        startsAt: packedSessionDTO.starts_at,
        units: packedSessionDTO.units,
        sessionTypeId: packedSessionDTO.session_type_id,
      };
    };

    return {
      id: sessionPackDTO.id,
      isPack: sessionPackDTO.is_pack,
      label: sessionPackDTO.label,
      packedSessions: sessionPackDTO.packed_sessions ? sessionPackDTO.packed_sessions.map(adaptPack) : [],
      startsAt: sessionPackDTO.starts_at,
      units: sessionPackDTO.units,
    };
  }

  /**
   * `heldSessions` are the lines of the cart this response replaces. They lend the catalogue price a response leaves out and keep a
   * clear the response does not confirm yet; every price and total shown comes from the response (GAME-1722).
   */
  fromApi(response: BaseResponse<CartData>, heldSessions: readonly CartSession[] = []): BaseResponse<Cart> {
    const heldSessionsById = new Map(heldSessions.map((session: CartSession) => [session.sessionId, session]));
    return new BaseResponse<Cart>(this.getData(response?.data, heldSessionsById), this.getError(response?.error));
  }

  private getError(data: BaseErrorResponse | null | undefined) {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(data: CartData | null | undefined, heldSessionsById: ReadonlyMap<number, CartSession>): Cart | null {
    if (data != null) {
      const sessionItemsByDatetime: Map<string, CartSession[]> | undefined = new Map();
      let timezone: string | null | undefined = null;
      data.session_items.forEach((session: CartSessionData) => {
        if (!timezone) {
          timezone = session.timezone;
        }
        // Use the products key for shop products to match frontend cart structure
        const sessionKey = session.is_shop_product ? PRODUCTS_GROUP_KEY : session.start_date;
        let sessionItems: CartSession[] = [];
        if (sessionKey && sessionItemsByDatetime.has(sessionKey)) {
          sessionItems = sessionItemsByDatetime.get(sessionKey) ?? [];
        }

        let sessionAdjustment: CartSessionAdjustmentPrice | undefined = undefined;
        if (session.override_prices) {
          const adjustment: Partial<CartSessionAdjustmentPrice> = {};

          if (
            session.override_prices.total_price_with_override?.amount !== null &&
            session.override_prices.total_price_with_override?.currency
          ) {
            adjustment.totalPriceWithOverride = {
              amount: session.override_prices.total_price_with_override.amount,
              currency: session.override_prices.total_price_with_override.currency,
            };
          }

          if (
            session.override_prices.total_price_without_override?.amount !== null &&
            session.override_prices.total_price_without_override?.currency
          ) {
            adjustment.totalPriceWithoutOverride = {
              amount: session.override_prices.total_price_without_override.amount,
              currency: session.override_prices.total_price_without_override.currency,
            };
          }

          if (
            session.override_prices.total_surcharge_with_override?.amount !== null &&
            session.override_prices.total_surcharge_with_override?.currency
          ) {
            adjustment.totalSurchargeWithOverride = {
              amount: session.override_prices.total_surcharge_with_override.amount,
              currency: session.override_prices.total_surcharge_with_override.currency,
            };
          }

          if (
            session.override_prices.total_surcharge_without_override?.amount !== null &&
            session.override_prices.total_surcharge_without_override?.currency
          ) {
            adjustment.totalSurchargeWithoutOverride = {
              amount: session.override_prices.total_surcharge_without_override.amount,
              currency: session.override_prices.total_surcharge_without_override.currency,
            };
          }

          if (Object.keys(adjustment).length > 0) {
            sessionAdjustment = adjustment as CartSessionAdjustmentPrice;
          }
        }

        sessionItems.push(
          new CartSession(
            session.id,
            session.units,
            session.title,
            session.start_date,
            undefined,
            session.timezone,
            session.unit_price && session.unit_price.amount !== null && session.unit_price.currency
              ? new Money(session.unit_price.amount, session.unit_price.currency)
              : null,
            session.price && session.price.amount !== null && session.price.currency
              ? new Money(session.price.amount, session.price.currency)
              : null,
            session.total_surcharge_per_ticket &&
            session.total_surcharge_per_ticket.amount !== null &&
            session.total_surcharge_per_ticket.currency
              ? new Money(session.total_surcharge_per_ticket.amount, session.total_surcharge_per_ticket.currency)
              : null,
            session.surcharge_per_ticket && session.surcharge_per_ticket.amount !== null && session.surcharge_per_ticket.currency
              ? new Money(session.surcharge_per_ticket.amount, session.surcharge_per_ticket.currency)
              : null,
            (session.seat_references?.length ?? 0) > 0 ? session.seat_references : (session.seats ?? null),
            session.user_confirmation_messages ?? undefined,
            undefined, // ticketId
            undefined, // total
            undefined, // accessTicketIds
            undefined, // status
            undefined, // validatedCount
            undefined, // sessionAddress
            session.place_id, // sessionAddressId (venueId)
            undefined, // sessionAddressCityStandardId
            undefined, // ownerFullName
            undefined, // hasCodes
            undefined, // redeemedAt
            undefined, // isGuest
            undefined, // transfers
            undefined, // isExpired
            undefined, // createdAt
            undefined, // ownerEmail
            session.session_type_id
              ? new SessionType(
                  session.session_type_id,
                  undefined,
                  undefined,
                  session.is_add_on,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  session.is_shop_product ?? undefined,
                )
              : undefined,
            (session.seat_references?.length ?? 0) > 0 ? session.seats : undefined,
            sessionAdjustment,
            session.is_pack,
            session.main_plan_id,
            undefined,
            session.title_without_format,
            undefined,
            session.total_strikethrough_price != null && session.total_strikethrough_price.amount !== null
              ? new Money(session.total_strikethrough_price.amount, session.total_strikethrough_price.currency)
              : undefined,
          ),
        );
        this.#fillManualPrice(sessionItems[sessionItems.length - 1], session, heldSessionsById.get(session.id));
        if (session.bundle_discount && session.bundle_discount.amount !== null && session.bundle_discount.currency) {
          sessionItems[sessionItems.length - 1].bundleDiscount = new Money(
            session.bundle_discount.amount,
            session.bundle_discount.currency,
          );
        }
        if (session.source_session_type_id !== undefined) {
          sessionItems[sessionItems.length - 1].sourceSessionTypeId = session.source_session_type_id;
        }
        if (sessionKey) {
          sessionItemsByDatetime.set(sessionKey, sessionItems);
        }
      });
      return new Cart(
        sessionItemsByDatetime,
        timezone ?? undefined,
        data.id,
        data.number_of_tickets,
        data.total ? new Money(data.total.amount, data.total.currency) : null,
        data.total_surcharge && data.total_surcharge.amount !== null && data.total_surcharge.currency
          ? new Money(data.total_surcharge.amount, data.total_surcharge.currency)
          : null,
        data.total_surcharge_per_ticket && data.total_surcharge_per_ticket.amount !== null && data.total_surcharge_per_ticket.currency
          ? new Money(data.total_surcharge_per_ticket.amount, data.total_surcharge_per_ticket.currency)
          : null,
        data.user_confirmation_messages ?? undefined,
        data.created_at ? data.created_at : undefined,
        data.prepared_at,
        data.confirmed_at ?? undefined,
        data.user_id ? data.user_id : null,
        this.mapAppliedCoupon(data),
        this.buildChannel(data),
        timezone ? CartUtil.hasSessionsInFuture(sessionItemsByDatetime, timezone) : false,
        data.session_items.some(sessionItem => (sessionItem.seat_references?.length ?? 0) > 0 || (sessionItem.seats?.length ?? 0) > 0),
        undefined,
        undefined,
        data.total_tax_base && data.total_tax_base.amount !== null && data.total_tax_base.currency
          ? new Money(data.total_tax_base.amount, data.total_tax_base.currency)
          : undefined,
        data.tax_items
          ? data.tax_items.map(taxItem => {
              return {
                taxName: taxItem.tax_name,
                taxAmount: taxItem.tax_amount,
              };
            })
          : undefined,
        data.adjustment
          ? (() => {
              const adj = data.adjustment as CartAdjustmentPriceWithOperationData;
              return {
                amount: adj.amount,
                concept: adj.concept,
                operation: adj.operation,
                calculation: adj.calculation,
                couponCode: adj.coupon_code,
                total: adj.total,
                rounded: adj.rounded,
              };
            })()
          : undefined,
        data.total_without_override ? new Money(data.total_without_override.amount, data.total_without_override.currency) : undefined,
        data.total_without_discount ? new Money(data.total_without_discount.amount, data.total_without_discount.currency) : undefined,
        data.deposit && data.total ? (this.depositAdapter.fromApi(data.deposit, data.total.currency) ?? null) : null,
        undefined,
        undefined,
        undefined,
        data.total_tickets_without_discounts
          ? new Money(data.total_tickets_without_discounts.amount, data.total_tickets_without_discounts.currency)
          : undefined,
        this.#mapSessionItemLines(data.session_item_lines),
        undefined,
        this.#mapServingTimes(data.product_serving_times),
        data.is_flexible_bundle === true,
        data.total_bundle_discount && data.total_bundle_discount.amount > 0 && data.total_bundle_discount.currency
          ? new Money(data.total_bundle_discount.amount, data.total_bundle_discount.currency)
          : undefined,
      );
    }
    return null;
  }

  /**
   * Fills the manual price state of a line from the response. A response that still carries a price the previous request cleared
   * keeps the clear pending, so the next request sends the explicit null again.
   */
  #fillManualPrice(cartSession: CartSession, data: CartSessionData, heldSession: CartSession | undefined): void {
    const manualPriceData = data.manual_price ?? null;
    const catalogUnitPrice =
      this.#toMoney(data.configured_ticket_price) ??
      this.#toMoney(manualPriceData?.catalog_ticket_price) ??
      heldSession?.catalogUnitPrice ??
      null;
    if (catalogUnitPrice !== null) {
      cartSession.catalogUnitPrice = catalogUnitPrice;
    }
    if (manualPriceData === null) {
      return;
    }
    if (heldSession?.isManualPriceClearPending === true) {
      cartSession.isManualPriceClearPending = true;
      return;
    }
    cartSession.manualPrice = toCartSessionManualPrice(manualPriceData);
    cartSession.unitPrice = cartSession.manualPrice.unitPrice;
  }

  #toMoney(money: Money | null | undefined): Money | null {
    return money != null && money.amount !== null && money.currency ? new Money(money.amount, money.currency) : null;
  }

  #mapServingTimes(servingTimes: CartDataProductServingTime[] | undefined): ReadonlyMap<number, string> | undefined {
    const mapped = new Map<number, string>(
      (servingTimes ?? []).flatMap(
        (servingTime: CartDataProductServingTime): Array<[number, string]> =>
          servingTime.serving_at != null ? [[servingTime.session_id, servingTime.serving_at]] : [],
      ),
    );
    return mapped.size > 0 ? mapped : undefined;
  }

  #mapSessionItemLines(sessionItemLines: CartSessionItemLineData[] | undefined): CartSessionItemLine[] {
    if (sessionItemLines == null) {
      return [];
    }

    return sessionItemLines.map((line: CartSessionItemLineData) => ({
      id: line.id,
      mainPlanId: line.main_plan_id,
      parent: line.parent,
      sessionId: line.session_id,
    }));
  }

  private mapAppliedCoupon(data: CartData): Coupon | null {
    const coupon = data.coupon;
    if (!coupon) {
      return null;
    }
    return {
      code: coupon.code,
      creationPurpose: (coupon as { creation_purpose?: string }).creation_purpose,
      discount: new Money(coupon.discount.amount, coupon.discount.currency || data.total?.currency || ''),
    };
  }

  private buildChannel(data: CartData): Channel | null {
    if (data.channel_name) {
      return data.channel_name;
    }
    if (data.channel_id) {
      return new Channel(data.channel_id);
    }
    return null;
  }
}
