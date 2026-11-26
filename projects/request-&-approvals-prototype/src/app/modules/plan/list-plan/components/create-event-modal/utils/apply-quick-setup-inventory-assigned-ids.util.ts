import {
  QuickSetupCapacityGroup,
  QuickSetupInventoryAssignedIds,
  QuickSetupInventoryItem,
  QuickSetupInventoryPayload,
} from '../models/quick-setup-inventory.model';
import { resolveQuickSetupInventoryRowIds } from './resolve-quick-setup-inventory-row-ids.util';

export function applyQuickSetupInventoryAssignedIds(
  payload: QuickSetupInventoryPayload,
  assignedIds: QuickSetupInventoryAssignedIds,
): QuickSetupInventoryPayload {
  const groupIds = resolveQuickSetupInventoryRowIds(payload.capacity_groups, assignedIds.groupIdsByName);
  const tickets = withResolvedIds(
    [...payload.capacity_groups.flatMap(group => group.tickets), ...payload.ungrouped_tickets],
    assignedIds.ticketIdsByName,
  );
  let nextTicketIndex = 0;
  const takeTickets = (count: number): QuickSetupInventoryItem[] => tickets.slice(nextTicketIndex, (nextTicketIndex += count));

  return {
    ...payload,
    add_ons: withResolvedIds(payload.add_ons, assignedIds.addOnIdsByName),
    capacity_groups: payload.capacity_groups.map((group, index) => withGroupId(group, groupIds[index], takeTickets(group.tickets.length))),
    ungrouped_tickets: takeTickets(payload.ungrouped_tickets.length),
  };
}

function withGroupId(group: QuickSetupCapacityGroup, id: number | null, tickets: QuickSetupInventoryItem[]): QuickSetupCapacityGroup {
  const groupWithoutId: QuickSetupCapacityGroup = { ...group, tickets };
  delete groupWithoutId.id;

  return id === null ? groupWithoutId : { ...groupWithoutId, id };
}

function withResolvedIds(items: QuickSetupInventoryItem[], idsByName: Record<string, number>): QuickSetupInventoryItem[] {
  const resolvedIds = resolveQuickSetupInventoryRowIds(items, idsByName);

  return items.map((item, index) => {
    const resolvedId = resolvedIds[index];
    const itemWithoutId: QuickSetupInventoryItem = { ...item };
    delete itemWithoutId.id;

    return resolvedId === null ? itemWithoutId : { ...itemWithoutId, id: resolvedId };
  });
}
