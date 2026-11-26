import { InjectionToken } from '@angular/core';

export const POS_TICKET_SELECTOR_REARCHITECT = new InjectionToken<boolean>('POS_TICKET_SELECTOR_REARCHITECT', {
  factory: (): boolean => false,
});
