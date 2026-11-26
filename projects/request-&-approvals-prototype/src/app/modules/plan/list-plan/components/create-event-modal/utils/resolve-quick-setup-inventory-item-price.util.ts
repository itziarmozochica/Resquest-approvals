import { QuickSetupInventoryItem } from '../models/quick-setup-inventory.model';

export function resolveQuickSetupInventoryItemPrice(item: QuickSetupInventoryItem): number {
  if (item.price != null) {
    return item.price;
  }

  const tierPrices = [item.tier_prices?.normal, item.tier_prices?.peak, item.tier_prices?.valley].filter(
    (tierPrice): tierPrice is number => tierPrice != null,
  );

  return tierPrices.length > 0 ? Math.max(...tierPrices) : 0;
}
