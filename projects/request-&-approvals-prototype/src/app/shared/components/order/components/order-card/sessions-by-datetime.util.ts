import { ValidationStatus } from '../../../../../modules/validation/enums/validation-status.enum';

export interface SessionWithTransfersForGrouping {
  isCollapsed: boolean;
  session: {
    sessionStartAt?: string | null;
    sessionType?: { isShopProduct?: boolean; isTimeless?: boolean };
    status?: ValidationStatus;
  };
  transfers: unknown[];
}

export interface OrderTicketSessionGroup<T extends SessionWithTransfersForGrouping> {
  datetimeKey: string;
  sessions: T[];
  showDate: boolean;
}

export function isShopProductSession(session: SessionWithTransfersForGrouping['session']): boolean {
  return session.sessionType?.isShopProduct === true;
}

export function isTimelessTicketSession(session: SessionWithTransfersForGrouping['session']): boolean {
  return session.sessionType?.isTimeless === true && !isShopProductSession(session);
}

export function splitSessionsByProducts<T extends SessionWithTransfersForGrouping>(
  sessions: T[],
): {
  productSessions: T[];
  ticketSessions: T[];
} {
  const ticketSessions: T[] = [];
  const productSessions: T[] = [];

  for (const item of sessions) {
    if (isShopProductSession(item.session)) {
      productSessions.push(item);
    } else {
      ticketSessions.push(item);
    }
  }

  return { productSessions, ticketSessions };
}

export function buildTicketSessionGroups<T extends SessionWithTransfersForGrouping>(ticketSessions: T[]): OrderTicketSessionGroup<T>[] {
  const grouped = groupAndSortSessionsByDatetime(ticketSessions);

  return [...grouped.entries()]
    .sort(([datetimeKeyA], [datetimeKeyB]) => datetimeKeyA.localeCompare(datetimeKeyB))
    .map(([datetimeKey, sessions]) => ({
      datetimeKey,
      sessions,
      showDate: !sessions.every(item => isTimelessTicketSession(item.session)),
    }));
}

export function groupAndSortSessionsByDatetime<T extends SessionWithTransfersForGrouping>(sessionsWithTransfers: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const item of sessionsWithTransfers) {
    const key = item.session.sessionStartAt ?? '';
    const bucket = grouped.get(key);

    if (bucket) {
      bucket.push(item);
    } else {
      grouped.set(key, [item]);
    }
  }

  for (const sessions of grouped.values()) {
    sessions.sort(
      (a, b) => Number(a.session.status === ValidationStatus.CANCELLED) - Number(b.session.status === ValidationStatus.CANCELLED),
    );
  }

  return grouped;
}
