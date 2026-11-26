import { buildExplodeLevelTree, type ExplodeLevel, type ExplodeLevelRow } from '../../../core/utils/explode-pipe/explode-level-tree.util';
import { EXPLODE_PIPE_SEPARATOR } from '../../../core/utils/explode-pipe/explode-pipe.util';
import type { PartyCategory, PartyHierarchy, PartyLeaf } from '../../models/party-members/party-members.model';
import type { DaySummary } from '../../models/session-availability-summary.model';
import type { Session } from '../../models/session.model';
import { partyEligibleSessionsOfDay } from './party-members.util';

// Asked for every session of a timeslot once per leaf the fit walks, so each session answers once.
const leafKeyBySession = new WeakMap<Pick<Session, 'title'>, string>();

export function partyLeafPath(title: string): readonly string[] {
  const sections = title.split(EXPLODE_PIPE_SEPARATOR);

  return sections.length > 1 ? sections.slice(0, -1) : sections;
}

export function partySessionName(title: string): string {
  return (title.split(EXPLODE_PIPE_SEPARATOR).at(-1) ?? title).trim();
}

export function partyLeafKeyOfSession(session: Pick<Session, 'title'>): string {
  const cached = leafKeyBySession.get(session);

  if (cached !== undefined) {
    return cached;
  }

  const leafKey = partyLeafPath(session.title).join(EXPLODE_PIPE_SEPARATOR);
  leafKeyBySession.set(session, leafKey);

  return leafKey;
}

export function buildPartyHierarchy(daySummary: DaySummary, timeZone: string): PartyHierarchy {
  const leafKeys = [...new Set(partyEligibleSessionsOfDay(daySummary, timeZone).map(partyLeafKeyOfSession))];
  const tree = buildExplodeLevelTree(leafKeys.map((key: string): ExplodeLevelRow => ({ isSoldOut: false, key, name: key })));
  const categories = tree.children.map(
    (level: ExplodeLevel): PartyCategory => ({ leafKeys: collectRowKeys(level), name: level.displayName }),
  );

  return {
    categories,
    leaves: categories.flatMap((category: PartyCategory) => category.leafKeys.map(toLeaf)),
    tree,
  };
}

export function partyLeavesInCategory(hierarchy: PartyHierarchy, categoryName: string | null): readonly PartyLeaf[] {
  if (categoryName === null) {
    return hierarchy.leaves;
  }

  const leafKeys = new Set(hierarchy.categories.find((category: PartyCategory) => category.name === categoryName)?.leafKeys ?? []);

  return hierarchy.leaves.filter((leaf: PartyLeaf) => leafKeys.has(leaf.key));
}

function collectRowKeys(level: ExplodeLevel): readonly string[] {
  return [...level.rows.map((row: ExplodeLevelRow) => row.key), ...level.children.flatMap(collectRowKeys)];
}

function toLeaf(key: string): PartyLeaf {
  const path = key.split(EXPLODE_PIPE_SEPARATOR);

  return { key, name: path.at(-1) ?? key, path };
}
