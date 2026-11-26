import { AgreementCard } from '../models/agreement-card.model';

/**
 * Compares the persisted shape of two card lists. `name` is display-only and deliberately ignored,
 * and so is `sessionTypeIds` on plan-scoped cards: the plan scope covers everything, so ids left
 * over from a scope round-trip carry no persisted meaning. Cards are keyed by `agreementId`,
 * which is unique by construction (one card per agreement).
 */
export function areCardListsEqual(a: AgreementCard[], b: AgreementCard[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const byId = new Map(b.map(card => [card.agreementId, card]));
  return a.every(card => {
    const other = byId.get(card.agreementId);
    return (
      other != null &&
      other.active === card.active &&
      other.scopeKind === card.scopeKind &&
      other.coverageRule === card.coverageRule &&
      other.signerRole === card.signerRole &&
      (card.scopeKind === 'plan' || areSessionTypeIdsEqual(card.sessionTypeIds, other.sessionTypeIds))
    );
  });
}

function areSessionTypeIdsEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && [...a].sort((x, y) => x - y).join(',') === [...b].sort((x, y) => x - y).join(',');
}

export function cloneCards(cards: AgreementCard[]): AgreementCard[] {
  return cards.map(card => ({ ...card, sessionTypeIds: [...card.sessionTypeIds] }));
}
