import { InjectionToken, type Signal } from '@angular/core';

/**
 * Cart session ids a host has already ruled out, so the cart detail disables those lines without knowing why.
 * The host filters them: whichever rule decides it stays on the host's side of this token.
 */
export const UNAVAILABLE_CART_SESSION_IDS = new InjectionToken<Signal<ReadonlySet<number>>>('UNAVAILABLE_CART_SESSION_IDS');
