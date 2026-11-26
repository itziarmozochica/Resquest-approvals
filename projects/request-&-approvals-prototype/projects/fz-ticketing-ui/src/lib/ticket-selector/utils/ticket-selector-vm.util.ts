import {
  buildExplodeLevelTree,
  filterOngoingRowsForLevel,
  filterOutGlobalAddonOnlyRows,
  filterTicketTypesForLevel,
  getLastExplodeSegment,
  isIndependentAddon,
  namesHaveExplodePipe,
  resolveDefaultExplodePath,
  rowsAtExplodePath,
  separateIndependentAddons,
  toExplodeLevelRow,
  type CustomTabHierarchyLeafNode,
  type CustomTabHierarchyLevel,
  type CustomTabHierarchyParentNode,
  type ExplodeLevel,
  type Money,
  type Session,
} from '@fz/ticketing';

import type { FztPartyColumnVm } from '../models/party-ticket-column-vm.model';
import type {
  FztBreadcrumbVm,
  FztMultiDayRange,
  FztTabKind,
  FztTicketSelectorVm,
  FztTicketsSectionFrame,
  FztTicketsSectionVm,
  FztTileGridVm,
  FztTileSectionKind,
  FztTileSectionVm,
  FztTileVm,
} from '../models/ticket-selector-vm.model';
import { buildExplodeLevelRowsVm } from './explode-levels-vm.util';
import { getDisplayableUnitsAvailable } from './tile-availability.util';

export interface FztTicketRowInput {
  readonly availableTickets: number | null;
  readonly canIncrease: boolean;
  readonly customColor: string | null;
  readonly endsAt: string;
  readonly isAddon: boolean;
  readonly isHidden: boolean;
  readonly isMultiDay: boolean;
  readonly isOngoing: boolean;
  readonly isPass: boolean;
  readonly isPurchasable: boolean;
  readonly isShopProduct: boolean;
  readonly key: string;
  readonly name: string;
  readonly price: Money | null;
  readonly priceWithDiscount: Money | null;
  readonly quantity: number;
  readonly sessionId: number;
  readonly showWarning: boolean;
  readonly startsAt: string;
}

export interface FztTicketGridVmParams {
  readonly addonsIndependentFromExplodePipe: boolean;
  readonly addonsInSeparateSection: boolean;
  readonly allowMultiSession: boolean;
  readonly canOverrideCapacities: boolean;
  readonly cartLocked: boolean;
  readonly explodeLevelPath: readonly string[];
  readonly explodePipeEnabled: boolean;
  readonly firstTileTourAnchorId: string;
  readonly hiddenInSeparateSection: boolean;
  readonly isLoading: boolean;
  readonly locale: string;
  readonly rows: readonly FztTicketRowInput[];
  readonly showUnitsAvailable: boolean;
  readonly timeZone: string;
  readonly formatPrice: (money: Money) => string;
}

export interface FztCustomTabGridVmParams {
  readonly cartLocked: boolean;
  readonly forceDisableIncrease: boolean;
  readonly hierarchy: CustomTabHierarchyLevel;
  readonly path: readonly number[];
  readonly showUnitsAvailable: boolean;
  readonly tileColorBySessionId: ReadonlyMap<number, string>;
  readonly unavailableSessionIds: ReadonlySet<number>;
  readonly formatPrice: (money: Money) => string;
}

export interface FztTileVmParams {
  readonly cartLocked: boolean;
  readonly hasExplodePipe: boolean;
  readonly locale: string;
  readonly oneSessionBlocked: boolean;
  readonly showUnitsAvailable: boolean;
  readonly timeZone: string;
  readonly formatPrice: (money: Money) => string;
}

export interface FztTicketsSectionVmParams {
  readonly frame: FztTicketsSectionFrame;
  readonly grid: FztTileGridVm | null;
  readonly kind: FztTabKind;
  readonly showDateSelectorSlot: boolean;
  readonly party?: FztPartyColumnVm | null;
}

export interface FztTicketSelectorVmParams {
  readonly hideTabHeader: boolean;
  readonly keepAlive: boolean;
  readonly sections: Readonly<Record<string, FztTicketsSectionVm>>;
  readonly selectedTabIndex: number;
  readonly tabs: FztTicketSelectorVm['tabs'];
  readonly tabsTourAnchorId: string;
}

const SECTION_ORDER: readonly FztTileSectionKind[] = ['tickets', 'addons', 'hidden'];

export function buildTicketGridVm(params: FztTicketGridVmParams): FztTileGridVm {
  const primaryRows = params.rows.filter(row => !row.isOngoing);
  const ongoingRows = params.rows.filter(row => row.isOngoing);
  const hasExplodePipe = params.explodePipeEnabled && namesHaveExplodePipe(primaryRows.map(row => row.name));
  const addonsAreIndependent = hasExplodePipe && params.addonsIndependentFromExplodePipe;
  const displayRows = addonsAreIndependent ? filterOutGlobalAddonOnlyRows(primaryRows) : primaryRows;
  const independentAddons = addonsAreIndependent ? separateIndependentAddons(displayRows) : [];
  const levelCandidates = independentAddons.length > 0 ? filterTicketTypesForLevel(displayRows) : displayRows;

  const tree = buildExplodeLevelTree(levelCandidates.map(toExplodeLevelRow));
  const path = hasExplodePipe ? resolvePath(tree, params.explodeLevelPath) : [];
  const levelRows = hasExplodePipe ? rowsAtPath(levelCandidates, tree, path) : levelCandidates;
  const addonsToInclude = addonsAreIndependent && levelRows.some(row => !isIndependentAddon(row)) ? independentAddons : [];
  // Independent add-ons sit outside the explode-pipe tree, so they never decide which level's ongoing rows are shown.
  const ongoingReference = levelRows.length > 0 ? levelRows : levelCandidates;
  const visibleOngoingRows = filterOngoingRowsForLevel(ongoingRows, ongoingReference, hasExplodePipe);
  const visibleRows = [...levelRows, ...visibleOngoingRows, ...addonsToInclude];

  const oneSessionBlockedSessionIds = resolveOneSessionBlockedSessionIds(visibleRows, params);
  const tileParams: FztTileVmParams = {
    cartLocked: params.cartLocked,
    formatPrice: params.formatPrice,
    hasExplodePipe,
    locale: params.locale,
    oneSessionBlocked: false,
    showUnitsAvailable: params.showUnitsAvailable,
    timeZone: params.timeZone,
  };

  const buckets = new Map<FztTileSectionKind, FztTileVm[]>();

  for (const row of visibleRows) {
    const kind = sectionKindOf(row, params);
    const tiles = buckets.get(kind) ?? [];

    tiles.push(buildTileVm(row, { ...tileParams, oneSessionBlocked: oneSessionBlockedSessionIds.has(row.sessionId) }));
    buckets.set(kind, tiles);
  }

  const sections: FztTileSectionVm[] = SECTION_ORDER.filter(kind => (buckets.get(kind)?.length ?? 0) > 0).map(kind => ({
    kind,
    tiles: buckets.get(kind) ?? [],
  }));

  return {
    breadcrumbs: [],
    firstTileTourAnchorId: params.firstTileTourAnchorId,
    levels: hasExplodePipe ? buildExplodeLevelRowsVm(tree, path) : [],
    navigationKey: path.join(' | '),
    sections: params.isLoading ? [] : sections,
    showTaxesIncluded: !params.isLoading && visibleRows.length > 0,
    skeleton: params.isLoading,
    testId: 'oss-ticket-selector',
  };
}

export function buildCustomTabGridVm(params: FztCustomTabGridVmParams): FztTileGridVm {
  const trail = resolveCustomTabTrail(params.hierarchy, params.path);
  const level = trail[trail.length - 1];
  const sessionsById = new Map(params.hierarchy.sessions.map(session => [session.id, session]));

  const tiles: FztTileVm[] = [
    ...level.parentNodes.map((parent, index) => buildCustomTabParentTileVm(parent, index)),
    ...level.leafNodes.map((leaf, index) => buildCustomTabLeafTileVm(leaf, index, sessionsById, params)),
  ]
    .filter((entry): entry is { order: number; tile: FztTileVm } => entry !== null)
    .sort((left, right) => (left.order === right.order ? left.tile.name.localeCompare(right.tile.name) : left.order - right.order))
    .map(entry => entry.tile);

  return {
    breadcrumbs: trail.map((node, depth) => ({ depth, isCurrentLevel: depth === trail.length - 1, name: node.name })),
    firstTileTourAnchorId: '',
    levels: [],
    navigationKey: params.path.join('>'),
    sections: tiles.length > 0 ? [{ kind: 'tickets', tiles }] : [],
    showTaxesIncluded: false,
    skeleton: false,
    testId: null,
  };
}

export function buildTileVm(row: FztTicketRowInput, params: FztTileVmParams): FztTileVm {
  const name = params.hasExplodePipe ? (getLastExplodeSegment(row.name) ?? '') : row.name;
  const isRegularTicket = !row.isAddon && !row.isPass && !row.isShopProduct;
  const isOngoing = isRegularTicket && row.isOngoing;
  const isMultiDay = isOngoing || (isRegularTicket && row.isMultiDay);
  const multiDayRange: FztMultiDayRange | null = isMultiDay
    ? { endsAt: row.endsAt, locale: params.locale, startsAt: row.startsAt, timeZone: params.timeZone }
    : null;

  return {
    category: row.isAddon ? 'addon' : 'session',
    customColor: row.customColor,
    isHidden: row.isHidden,
    isMultiDay,
    isOngoing,
    isOutOfStock: row.availableTickets === 0,
    isUnavailable: params.cartLocked || !row.canIncrease || params.oneSessionBlocked,
    key: row.key,
    kind: 'leaf',
    multiDayRange,
    name,
    priceLabel: row.price === null ? null : params.formatPrice(row.price),
    priceWithDiscountLabel: row.priceWithDiscount === null ? null : params.formatPrice(row.priceWithDiscount),
    renderKey: row.key,
    sessionId: row.sessionId,
    showWarning: row.showWarning,
    unitsAvailable: params.showUnitsAvailable ? getDisplayableUnitsAvailable(row.availableTickets) : null,
    variant: 'default',
  };
}

export function buildTicketsSectionVm(params: FztTicketsSectionVmParams): FztTicketsSectionVm {
  return {
    frame: params.frame,
    grid: params.grid,
    kind: params.kind,
    party: params.party ?? null,
    showDateSelectorSlot: params.showDateSelectorSlot,
  };
}

export function buildTicketSelectorVm(params: FztTicketSelectorVmParams): FztTicketSelectorVm {
  return {
    hideTabHeader: params.hideTabHeader,
    keepAlive: params.keepAlive,
    sections: params.sections,
    selectedTabIndex: params.selectedTabIndex,
    tabs: params.tabs,
    tabsTourAnchorId: params.tabsTourAnchorId,
  };
}

export function resolveCustomTabTrail(
  hierarchy: CustomTabHierarchyLevel,
  path: readonly number[],
): readonly (CustomTabHierarchyLevel | CustomTabHierarchyParentNode)[] {
  const trail: (CustomTabHierarchyLevel | CustomTabHierarchyParentNode)[] = [hierarchy];

  for (const index of path) {
    const current = trail[trail.length - 1];

    if (index < 0 || index >= current.parentNodes.length) {
      return trail;
    }

    trail.push(current.parentNodes[index]);
  }

  return trail;
}

export function customTabBreadcrumbsVm(hierarchy: CustomTabHierarchyLevel, path: readonly number[]): readonly FztBreadcrumbVm[] {
  const trail = resolveCustomTabTrail(hierarchy, path);

  return trail.map((node, depth) => ({ depth, isCurrentLevel: depth === trail.length - 1, name: node.name }));
}

function resolvePath(tree: ExplodeLevel, preferred: readonly string[]): readonly string[] {
  if (preferred.length > 0) {
    return preferred;
  }

  return resolveDefaultExplodePath(tree);
}

function rowsAtPath(rows: readonly FztTicketRowInput[], tree: ExplodeLevel, path: readonly string[]): readonly FztTicketRowInput[] {
  const keys = new Set(rowsAtExplodePath(tree, path).map(row => row.key));

  return rows.filter(row => keys.has(row.key));
}

function sectionKindOf(row: FztTicketRowInput, params: FztTicketGridVmParams): FztTileSectionKind {
  if (row.isHidden && params.hiddenInSeparateSection && !row.isOngoing) {
    return 'hidden';
  }

  if (row.isAddon && params.addonsInSeparateSection) {
    return 'addons';
  }

  return 'tickets';
}

function resolveOneSessionBlockedSessionIds(
  visibleRows: readonly FztTicketRowInput[],
  params: FztTicketGridVmParams,
): ReadonlySet<FztTicketRowInput['sessionId']> {
  if (params.allowMultiSession) {
    return new Set<number>();
  }

  const rowsBySessionId = dedupeBySessionId(visibleRows, params.canOverrideCapacities);
  const areAllCountersEmpty = [...rowsBySessionId.values()].every(row => row.isAddon || row.quantity === 0);

  if (areAllCountersEmpty) {
    return new Set<number>();
  }

  return new Set([...rowsBySessionId.values()].filter(row => !row.isAddon && row.quantity === 0).map(row => row.sessionId));
}

function dedupeBySessionId(rows: readonly FztTicketRowInput[], canOverrideCapacities: boolean): ReadonlyMap<number, FztTicketRowInput> {
  const bySessionId = new Map<number, FztTicketRowInput>();

  for (const row of rows) {
    const existing = bySessionId.get(row.sessionId);
    const primaryWins = !canOverrideCapacities && existing !== undefined && !existing.isOngoing && row.isOngoing;

    if (!primaryWins) {
      bySessionId.set(row.sessionId, row);
    }
  }

  return bySessionId;
}

function buildCustomTabParentTileVm(parent: CustomTabHierarchyParentNode, index: number): { order: number; tile: FztTileVm } {
  return {
    order: parent.order,
    tile: {
      category: 'product',
      customColor: parent.customColor,
      isHidden: false,
      isMultiDay: false,
      isOngoing: false,
      isOutOfStock: false,
      isUnavailable: false,
      key: `parent:${index}`,
      kind: 'parent',
      multiDayRange: null,
      name: parent.name,
      priceLabel: null,
      priceWithDiscountLabel: null,
      renderKey: `parent:${index}:${parent.name}`,
      sessionId: null,
      showWarning: false,
      unitsAvailable: null,
      variant: 'large',
    },
  };
}

function buildCustomTabLeafTileVm(
  leaf: CustomTabHierarchyLeafNode,
  index: number,
  sessionsById: ReadonlyMap<number, Session>,
  params: FztCustomTabGridVmParams,
): { order: number; tile: FztTileVm } | null {
  if (leaf.sessionId === null) {
    return {
      order: leaf.order,
      tile: {
        category: 'product',
        customColor: leaf.customColor,
        isHidden: false,
        isMultiDay: false,
        isOngoing: false,
        isOutOfStock: true,
        isUnavailable: true,
        key: `leaf:placeholder:${index}`,
        kind: 'leaf',
        multiDayRange: null,
        name: leaf.customName ?? '',
        priceLabel: null,
        priceWithDiscountLabel: null,
        renderKey: `leaf:placeholder:${index}:${leaf.customName ?? ''}`,
        sessionId: null,
        showWarning: false,
        unitsAvailable: null,
        variant: 'large',
      },
    };
  }

  const session = sessionsById.get(Number(leaf.sessionId));

  if (session === undefined) {
    return null;
  }

  const name = leaf.customName === null || leaf.customName === '' ? session.title : leaf.customName;

  return {
    order: leaf.order,
    tile: {
      category: 'product',
      customColor: params.tileColorBySessionId.get(session.id) ?? leaf.customColor,
      isHidden: false,
      isMultiDay: false,
      isOngoing: false,
      isOutOfStock: session.availableTickets === 0,
      isUnavailable: isCustomTabLeafUnavailable(session, params),
      key: `leaf:${session.id}`,
      kind: 'leaf',
      multiDayRange: null,
      name,
      priceLabel: session.ticketPrice === null ? null : params.formatPrice(session.ticketPrice),
      priceWithDiscountLabel: null,
      renderKey: `${params.path.join('>')}|leaf|${session.id}|${name}`,
      sessionId: session.id,
      showWarning: false,
      unitsAvailable: params.showUnitsAvailable ? getDisplayableUnitsAvailable(session.availableTickets) : null,
      variant: 'large',
    },
  };
}

function isCustomTabLeafUnavailable(session: Session, params: FztCustomTabGridVmParams): boolean {
  if (params.cartLocked) {
    return true;
  }

  if (params.unavailableSessionIds.has(session.id)) {
    return true;
  }

  if (session.sessionType?.isShopProduct === true) {
    return false;
  }

  return params.forceDisableIncrease;
}
