import { CartSession } from '../../../models/cart/cart-session.model';

/**
 * Pack constituents are display rows, never cart lines: they hang off their parent session so that
 * totals, payloads and fiscal documents cannot reach them. Rendering clones them because the order
 * views fuse and mutate the sessions they are given.
 */
export function packConstituentsOf(session: CartSession): CartSession[] {
  return (session.packConstituents ?? []).map(constituent => constituent.clone());
}

export function withPackConstituents(sessions: CartSession[]): CartSession[] {
  return sessions.flatMap(session => [session, ...packConstituentsOf(session)]);
}
