import { TicketHistoryItem } from './ticket-history-item';

function getTicketHistoryItemTime(item: TicketHistoryItem): number {
  return item.date ? new Date(item.date).getTime() : Number.POSITIVE_INFINITY;
}

export function sortTicketHistoryItems(items: TicketHistoryItem[]): TicketHistoryItem[] {
  return [...items].sort((a, b) => {
    const aTime = getTicketHistoryItemTime(a);
    const bTime = getTicketHistoryItemTime(b);
    if (aTime === bTime) {
      return 0;
    }
    return bTime - aTime;
  });
}
