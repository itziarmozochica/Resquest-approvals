import { QuickSetupCapacityGroup, QuickSetupInventoryGroupFormValue } from '../../../../../models/quick-setup-inventory.model';
import { mapQuickSetupInventoryItem } from './map-quick-setup-inventory-item.util';

export function mapQuickSetupInventoryGroup(value: QuickSetupInventoryGroupFormValue, isPricesByTier: boolean): QuickSetupCapacityGroup {
  const group: QuickSetupCapacityGroup = {
    frequency: value.frequency,
    max_capacity: value.maxCapacity == null ? null : Number(value.maxCapacity),
    name: String(value.name).trim(),
    tickets: value.tickets.map(ticket => mapQuickSetupInventoryItem(ticket, isPricesByTier)),
  };

  if (value.id != null) {
    group.id = value.id;
  }

  return group;
}
