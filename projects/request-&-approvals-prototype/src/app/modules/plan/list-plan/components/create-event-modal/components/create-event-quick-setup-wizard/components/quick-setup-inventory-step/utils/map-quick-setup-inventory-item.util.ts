import { isEmptyRichTextHtml } from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-content.utils';
import { SessionTypeSelectionRule } from '@fz-original/app/shared/services/sessions/session-type.model';

import {
  QuickSetupInventoryItem,
  QuickSetupInventoryItemFormValue,
  QuickSetupInventoryRules,
  QuickSetupInventoryTierPrices,
} from '../../../../../models/quick-setup-inventory.model';
import { isTierPriceFilled } from '../quick-setup-inventory-step.validators';

export const QUICK_SETUP_NO_RULE_OPTION_ID = 'no_rule';
const QUICK_SETUP_NEEDED_SESSION_TYPE_MAX = 14;
const QUICK_SETUP_NEEDED_SESSION_TYPE_MIN = 1;

export function mapQuickSetupInventoryItem(value: QuickSetupInventoryItemFormValue, isPricesByTier: boolean): QuickSetupInventoryItem {
  const item: QuickSetupInventoryItem = {
    max_capacity: value.maxCapacity == null ? null : Number(value.maxCapacity),
    name: String(value.name),
    product_type: String(value.productType),
  };

  if (value.id != null) {
    item.id = value.id;
  }

  if (isPricesByTier) {
    item.tier_prices = mapQuickSetupInventoryTierPrices(value);
  } else {
    item.price = Number(value.price);
  }

  if (!isEmptyRichTextHtml(value.instructions)) {
    item.instructions = String(value.instructions);
  }

  item.details = isEmptyRichTextHtml(value.details) ? '' : String(value.details);

  if (value.minToSell != null || value.maxToSell != null) {
    item.allowed_num_tickets = {
      maximum: Number(value.maxToSell ?? value.minToSell),
      minimum: Number(value.minToSell ?? 1),
    };
  }

  const rules = mapQuickSetupInventoryItemRules(value);

  if (rules !== undefined) {
    item.rules = rules;
  }

  return item;
}

function mapQuickSetupInventoryTierPrices(value: QuickSetupInventoryItemFormValue): QuickSetupInventoryTierPrices {
  const tierPrices: QuickSetupInventoryTierPrices = {};

  if (isTierPriceFilled(value.valleyPrice)) {
    tierPrices.valley = Number(value.valleyPrice);
  }

  if (isTierPriceFilled(value.normalPrice)) {
    tierPrices.normal = Number(value.normalPrice);
  }

  if (isTierPriceFilled(value.peakPrice)) {
    tierPrices.peak = Number(value.peakPrice);
  }

  return tierPrices;
}

function mapQuickSetupInventoryItemRules(value: QuickSetupInventoryItemFormValue): QuickSetupInventoryRules | undefined {
  if (value.selectionRule === SessionTypeSelectionRule.required) {
    return {
      selection_rule: SessionTypeSelectionRule.required,
    };
  }

  if (value.selectionRule !== SessionTypeSelectionRule.needsSessionType) {
    return undefined;
  }

  const neededSessionTypeNames = value.neededSessionTypes.map(name => name.trim()).filter(name => name.length > 0);

  if (neededSessionTypeNames.length === 0) {
    return undefined;
  }

  return {
    needed_session_types: neededSessionTypeNames.map(neededSessionTypeName => ({
      max: QUICK_SETUP_NEEDED_SESSION_TYPE_MAX,
      min: QUICK_SETUP_NEEDED_SESSION_TYPE_MIN,
      session_type_name: neededSessionTypeName,
    })),
    selection_rule: SessionTypeSelectionRule.needsSessionType,
  };
}
