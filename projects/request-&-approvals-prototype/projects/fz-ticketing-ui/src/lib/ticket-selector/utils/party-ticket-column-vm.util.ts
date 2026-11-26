import {
  buildPartyHierarchy,
  filterTimeslotsFromHour,
  fitPartyAtLeaf,
  partyLeavesInCategory,
  partyQuantityTotal,
  partyTimeslotsOfDay,
  type DaySummary,
  type PartyCategory,
  type PartyFit,
  type PartyFitParams,
  type PartyHierarchy,
  type PartyLeaf,
  type PartyQuantities,
} from '@fz/ticketing';

import { formatTimeslotTimeLabel } from '../../date-selector/utils/date-selector-labels.util';
import type {
  FztCategoryChipVm,
  FztPartyColumnVm,
  FztPartyStartTimeVm,
  FztPartyTileGridState,
  FztPartyTileVm,
} from '../models/party-ticket-column-vm.model';
import { getDisplayableUnitsAvailable } from './tile-availability.util';

export interface FztPartyColumnVmParams {
  readonly category: string | null;
  readonly daySummary: DaySummary | null;
  readonly fitParams: PartyFitParams;
  readonly hourFilter: string | null;
  readonly isDayLoaded: boolean;
  readonly party: PartyQuantities;
  readonly searchedAt: number;
  readonly showTaxesIncluded: boolean;
}

export function buildPartyColumnVm(params: FztPartyColumnVmParams): FztPartyColumnVm {
  const partySize = partyQuantityTotal(params.party);
  const awaitingParty = isAwaitingParty(params.party, partySize);
  const day = awaitingParty ? null : loadPartyDay(params);
  const categories: readonly CategoryAvailability[] = day === null ? [] : listCategories(day);
  const noActivities = hasNoActivities(partySize, day, categories);
  const selected = noActivities ? null : selectCategory(categories, params.category);

  return {
    categoryChips: (noActivities ? [] : categories).map(
      (category: CategoryAvailability): FztCategoryChipVm => ({
        category: category.name,
        isDisabled: !category.isAvailable,
        isSelected: category === selected,
        key: categoryChipKey(category.name),
      }),
    ),
    grid: {
      navigationKey: categoryChipKey(selected?.name ?? null),
      state: partyTileGridState(awaitingParty, params.isDayLoaded, noActivities),
      tiles: day === null || selected === null ? [] : buildPartyTiles(day, selected.name, params),
    },
    showTaxesIncluded: params.showTaxesIncluded,
  };
}

interface PartyDay {
  readonly hierarchy: PartyHierarchy;
  readonly fitsAtLeaf: (leafKey: string) => readonly PartyFit[];
}

interface CategoryAvailability {
  readonly isAvailable: boolean;
  readonly name: string;
}

function loadPartyDay(params: FztPartyColumnVmParams): PartyDay | null {
  if (!params.isDayLoaded || params.daySummary === null) {
    return null;
  }

  const timeZone = params.fitParams.timeZone;
  const timeslots = filterTimeslotsFromHour(
    partyTimeslotsOfDay(params.daySummary, timeZone, params.searchedAt),
    params.hourFilter,
    timeZone,
  );
  const fitsByLeaf = new Map<string, readonly PartyFit[]>();

  return {
    hierarchy: buildPartyHierarchy(params.daySummary, timeZone),
    fitsAtLeaf: (leafKey: string): readonly PartyFit[] => {
      let fits = fitsByLeaf.get(leafKey);

      if (fits === undefined) {
        fits = fitPartyAtLeaf(timeslots, leafKey, params.party, params.fitParams);
        fitsByLeaf.set(leafKey, fits);
      }

      return fits;
    },
  };
}

function listCategories(day: PartyDay): readonly CategoryAvailability[] {
  return day.hierarchy.categories.map(
    (category: PartyCategory): CategoryAvailability => ({
      isAvailable: partyLeavesInCategory(day.hierarchy, category.name).some((leaf: PartyLeaf) =>
        hasSelectableStartTime(day.fitsAtLeaf(leaf.key)),
      ),
      name: category.name,
    }),
  );
}

function selectCategory(categories: readonly CategoryAvailability[], picked: string | null): CategoryAvailability | null {
  const pickedCategory = categories.find((category: CategoryAvailability) => category.name === picked);

  if (pickedCategory?.isAvailable) {
    return pickedCategory;
  }

  const firstAvailable = categories.find((category: CategoryAvailability) => category.isAvailable);

  return firstAvailable ?? null;
}

function hasSelectableStartTime(fits: readonly PartyFit[]): boolean {
  return !fits.every(isSoldOut) && fits.some((fit: PartyFit) => fit.isSelectable);
}

function hasNoActivities(partySize: number, day: PartyDay | null, categories: readonly CategoryAvailability[]): boolean {
  return day !== null && partySize > 0 && !categories.some((category: CategoryAvailability) => category.isAvailable);
}

function partyTileGridState(awaitingParty: boolean, isDayLoaded: boolean, noActivities: boolean): FztPartyTileGridState {
  if (awaitingParty) {
    return 'awaiting-party';
  }

  if (!isDayLoaded) {
    return 'skeleton';
  }

  return noActivities ? 'no-activities' : 'tiles';
}

function isAwaitingParty(party: PartyQuantities, partySize: number): boolean {
  return Object.keys(party).length > 0 && partySize === 0;
}

function buildPartyTiles(day: PartyDay, category: string, params: FztPartyColumnVmParams): readonly FztPartyTileVm[] {
  const timeZone = params.fitParams.timeZone;

  return partyLeavesInCategory(day.hierarchy, category).map((leaf: PartyLeaf): FztPartyTileVm => {
    const fits = day.fitsAtLeaf(leaf.key);

    return {
      key: leaf.key,
      name: leaf.name,
      startTimes: fits.every(isSoldOut) ? [] : fits.map((fit: PartyFit) => buildStartTimeVm(leaf, fit, timeZone)),
    };
  });
}

function isSoldOut(fit: PartyFit): boolean {
  return fit.stock <= 0;
}

function buildStartTimeVm(leaf: PartyLeaf, fit: PartyFit, timeZone: string): FztPartyStartTimeVm {
  return {
    fit,
    isDisabled: !fit.isSelectable,
    key: `${leaf.key}@${fit.startTime}`,
    timeLabel: formatTimeslotTimeLabel(fit.startTime, timeZone),
    unitsAvailable: getDisplayableUnitsAvailable(fit.stock),
  };
}

function categoryChipKey(category: string | null): string {
  return category === null ? 'none' : `category:${category}`;
}
