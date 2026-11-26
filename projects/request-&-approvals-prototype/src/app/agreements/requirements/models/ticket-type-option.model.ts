export type TicketTypesState = 'error' | 'loading' | 'ready';

/** A ticket type the picker offers, or one it only keeps because a saved row points at it. */
interface CatalogTicketTypeOption {
  readonly id: number;
  /** `legacy` is a type the catalog carries but this picker never offers: a shop product. */
  readonly kind: 'legacy' | 'selectable';
  readonly label: string;
}

/** A selected id the catalog no longer carries, so there is no label to show for it. */
interface UnknownTicketTypeOption {
  readonly id: number;
  readonly kind: 'unknown';
  readonly label: null;
}

export type TicketTypeOption = CatalogTicketTypeOption | UnknownTicketTypeOption;
