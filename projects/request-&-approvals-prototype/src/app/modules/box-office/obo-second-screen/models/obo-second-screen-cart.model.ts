import moment from 'moment-timezone';

import { CartSession } from '../../../../shared/models/cart/cart-session.model';
import { Cart } from '../../../../shared/models/cart/cart.model';
import { Coupon } from '../../../../shared/models/cart/coupon.model';
import { IMoney, Money } from '../../../../shared/models/money.model';
import { getCartTotalTax } from '../../../../shared/utils/cart-total-tax.util';
import { OboSecondScreenCartSession } from './obo-second-screen-cart-item.model';
import { OboSecondScreenPlace, OboSecondScreenPlan } from './obo-second-screen-plan.model';

export interface OboSecondScreenCartSessionGroup {
  isoDate: string;
  sessions: OboSecondScreenCartSession[];
}

export interface OboSecondScreenCartPlanGroup {
  mainPlanId: number | null;
  place?: OboSecondScreenPlace;
  plan?: OboSecondScreenPlan;
  sessionGroups: OboSecondScreenCartSessionGroup[];
}

export class OboSecondScreenCart {
  constructor(
    public isoDate: string,
    public timeZone?: string,
    public totalPrice?: Money,
    public coupon?: Coupon,
    public sessions: OboSecondScreenCartSession[] = [],
    public sessionGroups: OboSecondScreenCartSessionGroup[] = [],
    public planGroups: OboSecondScreenCartPlanGroup[] = [],
    public totalTax?: IMoney,
  ) {
    if (this.sessionGroups.length === 0 && this.sessions.length > 0) {
      this.sessionGroups = [{ isoDate: this.isoDate, sessions: this.sessions }];
    }
    if (this.planGroups.length === 0 && this.sessionGroups.length > 0) {
      this.planGroups = [{ mainPlanId: null, sessionGroups: this.sessionGroups }];
    }
  }

  static from(cart: OboSecondScreenCart): OboSecondScreenCart {
    const sessions: OboSecondScreenCartSession[] = cart.sessions?.map(session => OboSecondScreenCartSession.from(session)) ?? [];
    const sessionGroups: OboSecondScreenCartSessionGroup[] = cart.sessionGroups?.map(group => ({
      isoDate: group.isoDate,
      sessions: group.sessions.map(session => OboSecondScreenCartSession.from(session)),
    })) ?? [{ isoDate: cart.isoDate, sessions }];
    const planGroups: OboSecondScreenCartPlanGroup[] = cart.planGroups?.map(group => ({
      mainPlanId: group.mainPlanId ?? null,
      place: group.place,
      plan: group.plan
        ? {
            places: group.plan.places?.map(place => ({
              id: place.id,
              name: place.name,
            })),
            name: group.plan.name,
            imageUrl: group.plan.imageUrl,
          }
        : undefined,
      sessionGroups: group.sessionGroups.map(sessionGroup => ({
        isoDate: sessionGroup.isoDate,
        sessions: sessionGroup.sessions.map(session => OboSecondScreenCartSession.from(session)),
      })),
    })) ?? [{ mainPlanId: null, sessionGroups }];
    return new OboSecondScreenCart(
      cart.isoDate,
      cart.timeZone,
      cart.totalPrice,
      cart.coupon,
      sessions,
      sessionGroups,
      planGroups,
      cart.totalTax,
    );
  }

  static fromCart(cart: Cart, plansByMainPlanId: ReadonlyMap<number, OboSecondScreenPlan> = new Map()): OboSecondScreenCart {
    const sessionGroups: OboSecondScreenCartSessionGroup[] = this.#mapSessionGroupsByDatetime(cart.sessionItemsByDatetime);
    const sessions: OboSecondScreenCartSession[] = sessionGroups.flatMap(group => group.sessions);
    const planGroups: OboSecondScreenCartPlanGroup[] = this.#mapPlanGroups(cart, plansByMainPlanId);
    return new OboSecondScreenCart(
      sessionGroups[0]?.isoDate ?? moment(cart.sessionItemsByDatetime.keys().next().value).toISOString(),
      cart.timezone,
      cart.total ?? undefined,
      cart.appliedCoupon ?? undefined,
      sessions,
      sessionGroups,
      planGroups,
      getCartTotalTax(cart),
    );
  }

  static #mapSessionGroupsByDatetime(
    sessionsByDatetime: ReadonlyMap<string, ReadonlyArray<CartSession>>,
  ): OboSecondScreenCartSessionGroup[] {
    return [...sessionsByDatetime.entries()].map(([isoDate, cartSessions]) => ({
      isoDate: moment(isoDate).toISOString(),
      sessions: cartSessions.flatMap((cartSession: CartSession) => OboSecondScreenCartSession.rowsFromCartSession(cartSession)),
    }));
  }

  static #mapPlanGroups(cart: Cart, plansByMainPlanId: ReadonlyMap<number, OboSecondScreenPlan>): OboSecondScreenCartPlanGroup[] {
    const planGroups: OboSecondScreenCartPlanGroup[] = [];
    const sessionsByMainPlanAndDatetime = cart.getSessionItemsByMainPlanAndDatetime();

    for (const [mainPlanId, sessionsByDatetime] of sessionsByMainPlanAndDatetime.entries()) {
      const plan = plansByMainPlanId.get(mainPlanId);
      planGroups.push({
        mainPlanId,
        place: this.#resolveGroupPlace(sessionsByDatetime, plan),
        plan,
        sessionGroups: this.#mapSessionGroupsByDatetime(sessionsByDatetime),
      });
    }

    const sessionGroupsWithoutMainPlan = this.#mapSessionGroupsWithoutMainPlan(cart.sessionItemsByDatetime);
    if (sessionGroupsWithoutMainPlan.length > 0) {
      planGroups.push({
        mainPlanId: null,
        sessionGroups: sessionGroupsWithoutMainPlan,
      });
    }

    return planGroups;
  }

  static #mapSessionGroupsWithoutMainPlan(
    sessionsByDatetime: ReadonlyMap<string, ReadonlyArray<CartSession>>,
  ): OboSecondScreenCartSessionGroup[] {
    const sessionGroupsWithoutMainPlan: OboSecondScreenCartSessionGroup[] = [];
    for (const [isoDate, cartSessions] of sessionsByDatetime.entries()) {
      const sessionsInDatetimeWithoutMainPlan = cartSessions.filter(cartSession => cartSession.mainPlanId == null);
      if (sessionsInDatetimeWithoutMainPlan.length === 0) {
        continue;
      }
      sessionGroupsWithoutMainPlan.push({
        isoDate: moment(isoDate).toISOString(),
        sessions: sessionsInDatetimeWithoutMainPlan.flatMap((cartSession: CartSession) =>
          OboSecondScreenCartSession.rowsFromCartSession(cartSession),
        ),
      });
    }
    return sessionGroupsWithoutMainPlan;
  }

  static #resolveGroupPlace(
    sessionsByDatetime: ReadonlyMap<string, ReadonlyArray<CartSession>>,
    plan?: OboSecondScreenPlan,
  ): OboSecondScreenPlace | undefined {
    const placeIds = new Set<number>();
    for (const cartSessions of sessionsByDatetime.values()) {
      for (const cartSession of cartSessions) {
        if (cartSession.sessionAddressId != null) {
          placeIds.add(cartSession.sessionAddressId);
        }
      }
    }
    if (placeIds.size !== 1) {
      return undefined;
    }
    const placeId = [...placeIds][0];
    const placeName = plan?.places?.find(place => place.id === placeId)?.name;
    if (!placeName) {
      return undefined;
    }
    return {
      id: placeId,
      name: placeName,
    };
  }
}
