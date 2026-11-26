import { InjectionToken, type Signal } from '@angular/core';

import type { IgntAccordionVariant } from '../models/accordion.model';

/**
 * Contract an `ignt-accordion` exposes to the items it contains. Deliberately narrow:
 * items only need the group's visual treatment, never the group itself.
 */
export interface IgntAccordionContext {
  variant: Signal<IgntAccordionVariant>;
}

export const IGNT_ACCORDION = new InjectionToken<IgntAccordionContext>('IGNT_ACCORDION');
