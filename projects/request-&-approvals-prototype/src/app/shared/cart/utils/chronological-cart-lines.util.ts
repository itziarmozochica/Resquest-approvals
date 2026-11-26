import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { PRODUCTS_GROUP_KEY } from '@fz-original/app/shared/models/cart/cart.model';

export type ChronologicalCartBlock =
  | { datetime: string; kind: 'sessionGroup'; sessions: CartSession[] }
  | { kind: 'product'; product: CartSession };

export type ChronologicalCartSection =
  | { datetime: string; kind: 'sessionGroup'; products: CartSession[]; sessions: CartSession[] }
  | { kind: 'productGroup'; products: CartSession[] };

export interface ChronologicalCartLines {
  blocks: ChronologicalCartBlock[];
  productsWithoutServingTime: CartSession[];
  sections: ChronologicalCartSection[];
}

interface TimedBlock {
  block: ChronologicalCartBlock;
  instant: number;
  isProduct: boolean;
  sessionId: number;
}

export function chronologicalCartLines(
  sessionItemsByDatetime: ReadonlyMap<string, CartSession[]>,
  products: CartSession[],
  servingTimesBySessionId: ReadonlyMap<number, string> | null,
): ChronologicalCartLines {
  const timedBlocks: TimedBlock[] = [];
  const productsWithoutServingTime: CartSession[] = [];

  sessionItemsByDatetime.forEach((sessions, datetime) => {
    timedBlocks.push({
      block: { datetime, kind: 'sessionGroup', sessions },
      instant: toInstant(datetime),
      isProduct: false,
      sessionId: 0,
    });
  });

  products.forEach(product => {
    const instant = toInstant(servingTimesBySessionId?.get(product.sessionId));
    if (Number.isNaN(instant)) {
      productsWithoutServingTime.push(product);
      return;
    }
    timedBlocks.push({ block: { kind: 'product', product }, instant, isProduct: true, sessionId: product.sessionId });
  });

  const blocks = timedBlocks
    .sort((a, b) => compareInstants(a.instant, b.instant) || Number(a.isProduct) - Number(b.isProduct) || a.sessionId - b.sessionId)
    .map(timedBlock => timedBlock.block);

  return {
    blocks,
    productsWithoutServingTime: [...productsWithoutServingTime].sort((a, b) => a.sessionId - b.sessionId),
    sections: groupProductsServedTogether(blocks, servingTimesBySessionId),
  };
}

export function chronologicalCartLinesFromGroups(
  sessionItemsByDatetime: ReadonlyMap<string, CartSession[]>,
  servingTimesBySessionId: ReadonlyMap<number, string> | null,
): ChronologicalCartLines {
  const products = sessionItemsByDatetime.get(PRODUCTS_GROUP_KEY) ?? [];
  const sessionGroups = new Map([...sessionItemsByDatetime].filter(([datetime]) => datetime !== PRODUCTS_GROUP_KEY));
  return chronologicalCartLines(sessionGroups, products, servingTimesBySessionId);
}

function groupProductsServedTogether(
  blocks: ChronologicalCartBlock[],
  servingTimesBySessionId: ReadonlyMap<number, string> | null,
): ChronologicalCartSection[] {
  const servedAt = (product: CartSession): number => toInstant(servingTimesBySessionId?.get(product.sessionId));
  const startsAt = (section: ChronologicalCartSection): number =>
    section.kind === 'sessionGroup' ? toInstant(section.datetime) : servedAt(section.products[0]);
  return blocks.reduce<ChronologicalCartSection[]>((sections, block) => {
    if (block.kind === 'sessionGroup') {
      return [...sections, { ...block, products: [] }];
    }
    const previous = sections.at(-1);
    if (previous && startsAt(previous) === servedAt(block.product)) {
      return [...sections.slice(0, -1), { ...previous, products: [...previous.products, block.product] }];
    }
    return [...sections, { kind: 'productGroup', products: [block.product] }];
  }, []);
}

function toInstant(value: string | null | undefined): number {
  return value ? Date.parse(value) : Number.NaN;
}

function compareInstants(a: number, b: number): number {
  if (Number.isNaN(a) || Number.isNaN(b)) {
    return Number(Number.isNaN(a)) - Number(Number.isNaN(b));
  }
  return a - b;
}
