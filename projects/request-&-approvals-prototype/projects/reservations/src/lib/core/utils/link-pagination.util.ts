import type { ReservationsPagination } from '../models/reservations-page.model';

const EMPTY: ReservationsPagination = { last: null, next: null, previous: null };

export function parseLinkPagination(header: string | null): ReservationsPagination {
  if (header === null || header.trim() === '') {
    return EMPTY;
  }

  const byRel = new Map<string, string>();
  for (const part of header.split(',')) {
    const url = /<(?<url>[^>]*)>/u.exec(part)?.groups?.url;
    const rel = /rel\s*=\s*"?(?<rel>[a-z]+)"?/iu.exec(part)?.groups?.rel.toLowerCase();
    if (url !== undefined && rel !== undefined) {
      byRel.set(rel, url);
    }
  }

  return {
    last: pageOf(byRel.get('last')),
    next: pageOf(byRel.get('next')),
    previous: pageOf(byRel.get('prev')),
  };
}

function pageOf(url: string | undefined): number | null {
  if (url === undefined) {
    return null;
  }

  const page = /[?&]page=(?<page>\d+)/u.exec(url)?.groups?.page;

  return page === undefined ? null : Number(page);
}
