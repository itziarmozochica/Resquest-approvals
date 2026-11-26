import type { IgntAccordionContext } from '../tokens/accordion.token';

/**
 * Fails fast when an item is rendered outside a group. The group owns the frame for the
 * `card` and `band` variants, so a container-less item cannot render its variant
 * correctly — a silent fallback would surface as a confusing visual bug far from
 * its cause.
 */
export function requireIgntAccordionContext(context: IgntAccordionContext | null): IgntAccordionContext {
  if (context === null) {
    throw new Error('<ignt-accordion-item> must be used inside an <ignt-accordion>.');
  }
  return context;
}
