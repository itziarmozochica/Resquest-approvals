import {
  PriceMatrixItem,
  PriceMatrixResponse,
} from '@fz-original/app/modules/inventory/inventory-pricing/shared/services/price-matrix/price-matrix.model';
import { CapacityTemplate } from '@fz-original/app/modules/inventory/shared/models/capacity-template.model';
import {
  SessionType,
  SessionTypeGroup,
  SessionTypeInventory,
  SessionTypeSelectionRule,
} from '@fz-original/app/shared/services/sessions/session-type.model';

import {
  QUICK_SETUP_CAPACITY_GROUP_FREQUENCIES,
  QUICK_SETUP_DEFAULT_CAPACITY_GROUP_FREQUENCY,
  QuickSetupCapacityGroupFrequency,
  QuickSetupInventoryGroupFormValue,
  QuickSetupInventoryItemFormValue,
  QuickSetupInventoryPrefill,
  QuickSetupInventoryTierPrices,
} from '../../../models/quick-setup-inventory.model';
import { QUICK_SETUP_NO_RULE_OPTION_ID } from '../components/quick-setup-inventory-step/utils/map-quick-setup-inventory-item.util';

const quickSetupTierNames: readonly (keyof QuickSetupInventoryTierPrices)[] = ['normal', 'peak', 'valley'];

export function mapResumedInventoryToPrefill(
  inventory: SessionTypeInventory,
  capacityTemplates: CapacityTemplate[],
  priceMatrix: PriceMatrixResponse | null,
): QuickSetupInventoryPrefill {
  const template = capacityTemplates.find(capacityTemplate => capacityTemplate.isDefault) ?? capacityTemplates[0];
  const templateGroups = template?.groups ?? [];
  const capacitiesByGroupId = new Map(
    templateGroups
      .filter(templateGroupItem => templateGroupItem.sessionTypeGroupId !== null)
      .map((templateGroupItem): [number | null, number | null] => [templateGroupItem.sessionTypeGroupId, templateGroupItem.capacity]),
  );
  const capacitiesBySessionTypeId = new Map(
    templateGroups.flatMap(templateGroupItem =>
      templateGroupItem.sessionTypes.map((sessionType): [number, number | null] => [sessionType.sessionTypeId, sessionType.capacity]),
    ),
  );
  const priceLists = priceMatrix?.priceLists ?? [];
  const basePrices = mapResumedBasePrices(priceLists);
  const tierPrices = mapResumedTierPrices(priceLists);
  const toItem = (sessionType: SessionType): QuickSetupInventoryItemFormValue =>
    mapResumedInventoryItem(
      sessionType,
      capacitiesBySessionTypeId.get(sessionType.id) ?? sessionType.defaultCapacity ?? null,
      basePrices.get(sessionType.id) ?? sessionType.basePrice ?? null,
      tierPrices.get(sessionType.id) ?? {},
    );
  const toItemWithOptions = (sessionType: SessionType): QuickSetupInventoryItemFormValue =>
    mapResumedInventoryItemOptions(sessionType, toItem(sessionType));
  const tickets = inventory.sessionTypes.filter(sessionType => !sessionType.isAddOn);

  return {
    addOns: inventory.sessionTypes.filter(sessionType => sessionType.isAddOn).map(toItemWithOptions),
    groups: inventory.sessionTypeGroups.map(group =>
      mapResumedInventoryGroup(
        group,
        capacitiesByGroupId.get(group.id) ?? group.defaultCapacity ?? null,
        tickets.filter(sessionType => sessionType.groups.some(ticketGroup => ticketGroup.id === group.id)).map(toItemWithOptions),
      ),
    ),
    isPricesByTier: tierPrices.size > 0,
    totalCapacity: template?.timeslotCapacity ?? null,
    ungroupedTickets: tickets.filter(sessionType => sessionType.groups.length === 0).map(toItemWithOptions),
  };
}

function mapResumedInventoryGroup(
  group: SessionTypeGroup,
  maxCapacity: number | null,
  tickets: QuickSetupInventoryItemFormValue[],
): QuickSetupInventoryGroupFormValue {
  return {
    frequency: resolveResumedGroupFrequency(group),
    id: group.id,
    maxCapacity,
    name: group.name,
    tickets,
  };
}

function resolveResumedGroupFrequency(group: SessionTypeGroup): QuickSetupCapacityGroupFrequency {
  return (
    QUICK_SETUP_CAPACITY_GROUP_FREQUENCIES.find(frequency => frequency === group.codePoolFrequency) ??
    QUICK_SETUP_DEFAULT_CAPACITY_GROUP_FREQUENCY
  );
}

function mapResumedInventoryItem(
  sessionType: SessionType,
  maxCapacity: number | null,
  price: number | null,
  tierPrices: QuickSetupInventoryTierPrices,
): QuickSetupInventoryItemFormValue {
  return {
    details: '',
    id: sessionType.id,
    instructions: '',
    maxCapacity,
    maxToSell: null,
    minToSell: null,
    name: sessionType.label,
    neededSessionTypes: [],
    normalPrice: tierPrices.normal ?? null,
    peakPrice: tierPrices.peak ?? null,
    price,
    productType: sessionType.productType ?? '',
    selectionRule: QUICK_SETUP_NO_RULE_OPTION_ID,
    valleyPrice: tierPrices.valley ?? null,
  };
}

function mapResumedBasePrices(priceLists: PriceMatrixItem[]): Map<number, number> {
  const basePriceList = priceLists.find(priceList => priceList.isBase);

  return new Map((basePriceList?.prices ?? []).map(price => [price.sessionTypeId, price.ticketPrice.amount]));
}

function mapResumedTierPrices(priceLists: PriceMatrixItem[]): Map<number, QuickSetupInventoryTierPrices> {
  const tierPrices = new Map<number, QuickSetupInventoryTierPrices>();

  for (const priceList of priceLists) {
    const tierName = quickSetupTierNames.find(name => name === priceList.targetedTier?.name.trim().toLowerCase());

    if (priceList.isBase || tierName === undefined) {
      continue;
    }

    for (const price of priceList.prices) {
      tierPrices.set(price.sessionTypeId, { ...tierPrices.get(price.sessionTypeId), [tierName]: price.ticketPrice.amount });
    }
  }

  return tierPrices;
}

function mapResumedInventoryItemOptions(
  sessionType: SessionType,
  item: QuickSetupInventoryItemFormValue,
): QuickSetupInventoryItemFormValue {
  const neededSessionTypes = resolveResumedNeededSessionTypes(sessionType);

  return {
    ...item,
    details: sessionType.details,
    instructions: sessionType.instructions ?? '',
    maxToSell: sessionType.allowedNumTickets?.maximum ?? null,
    minToSell: sessionType.allowedNumTickets?.minimum ?? null,
    neededSessionTypes,
    selectionRule: resolveResumedSelectionRule(sessionType, neededSessionTypes),
  };
}

function resolveResumedNeededSessionTypes(sessionType: SessionType): string[] {
  if (sessionType.rule?.selectionRule !== SessionTypeSelectionRule.needsSessionType) {
    return [];
  }

  return (sessionType.rule.neededSessionTypes ?? []).map(neededSessionType => neededSessionType.label);
}

function resolveResumedSelectionRule(sessionType: SessionType, neededSessionTypes: string[]): string {
  if (sessionType.rule?.selectionRule === SessionTypeSelectionRule.required) {
    return SessionTypeSelectionRule.required;
  }

  if (neededSessionTypes.length > 0) {
    return SessionTypeSelectionRule.needsSessionType;
  }

  return QUICK_SETUP_NO_RULE_OPTION_ID;
}
