import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { SessionType, SessionTypeAddOnConfiguration } from '@fz-original/app/shared/models/session-type/session-type.model';
import { isAddOnPricedFromTheRestOfTheCart } from '@fz-original/app/shared/models/session-type/session-type.util';

interface LocalPriceRestoration {
  addOnConfiguration?: SessionTypeAddOnConfiguration;
  adoptedSession: CartSession;
  unitPrice: Money;
  bundleDiscount?: Money | null;
  surchargePerTicket?: Money | null;
}

/**
 * `taxItems` is one cart-level amount, so a mix of gross and net lines cannot be reconciled:
 * stripping it loses the tax of the net lines, keeping it double-counts the gross ones. Prices and
 * the strip are therefore all or nothing, while labels carry no arithmetic and always restore.
 */
export function restoreLocalCartPresentation(adoptedCart: Cart, localCart: Cart | null): void {
  if (localCart === null) {
    adoptedCart.taxItems = undefined;
    adoptedCart.totalTaxBase = undefined;
    return;
  }
  const priceRestorations: LocalPriceRestoration[] = [];
  let everyLineCanBeRestored = true;
  for (const [datetime, adoptedSessions] of adoptedCart.sessionItemsByDatetime) {
    const localSessions = localCart.sessionItemsByDatetime.get(datetime) ?? [];
    for (const adoptedSession of adoptedSessions) {
      const localSession = localSessions.find(session => session.sessionId === adoptedSession.sessionId);
      if (localSession === undefined) {
        everyLineCanBeRestored = false;
        continue;
      }
      adoptedSession.sessionName = localSession.sessionName;
      adoptedSession.sessionNameWithoutFormat = localSession.sessionNameWithoutFormat;
      // A line priced from the rest of the cart needs its pricing type on the adopted line, or its local unit price would be charged alone.
      const needsAddOnConfiguration = isAddOnPricedFromTheRestOfTheCart(localSession.sessionType);
      if (localSession.unitPrice == null || (needsAddOnConfiguration && adoptedSession.sessionType === undefined)) {
        everyLineCanBeRestored = false;
        continue;
      }
      priceRestorations.push({
        addOnConfiguration: localSession.sessionType?.addOnConfiguration,
        adoptedSession,
        bundleDiscount: localSession.bundleDiscount,
        surchargePerTicket: localSession.surchargePerTicket,
        unitPrice: localSession.unitPrice,
      });
    }
  }
  if (everyLineCanBeRestored) {
    for (const restoration of priceRestorations) {
      restoration.adoptedSession.unitPrice = restoration.unitPrice;
      // A bundle discount belongs to the unit price it was computed against, so it travels with it:
      // keeping the adopted one over a local price would net a discount off a total it never earned.
      restoration.adoptedSession.bundleDiscount = restoration.bundleDiscount ?? null;
      if (restoration.surchargePerTicket != null) {
        restoration.adoptedSession.surchargePerTicket = restoration.surchargePerTicket;
      }
      // The local unit price is the add-on's own price, so the cart needs its pricing type to price it per ticket again.
      // `CartSession.clone()` shares the session type with the cart it was cloned from, so the line gets its own copy:
      // writing on the shared one would price that cart's backend line (already unit × n) per ticket again.
      const adoptedSessionType = restoration.adoptedSession.sessionType;
      if (restoration.addOnConfiguration !== undefined && adoptedSessionType !== undefined) {
        restoration.adoptedSession.sessionType = Object.assign(new SessionType(adoptedSessionType.id), adoptedSessionType, {
          addOnConfiguration: { ...adoptedSessionType.addOnConfiguration, ...restoration.addOnConfiguration },
        });
      }
    }
    adoptedCart.taxItems = undefined;
    adoptedCart.totalTaxBase = undefined;
  }
  adoptedCart.calculateTotal(adoptedCart.appliedCoupon ?? undefined);
}
