import { afterNextRender, DOCUMENT, inject, Injector } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { TicketingOnsiteSetupStorageService } from '@fz/ticketing';
import { catchError, map, Observable, of } from 'rxjs';

import { OdooFnbHandOff } from '../models/odoo-food-and-beverage-hand-off.model';
import { OdooPosHandoffService } from '../services/odoo-pos-handoff.service';
import { isPointOfSaleNotFoundError } from '../utils/point-of-sale-not-found.util';

export const odooFoodAndBeverageResolver: ResolveFn<OdooFnbHandOff> = (): Observable<OdooFnbHandOff> => {
  const document = inject(DOCUMENT);
  const injector = inject(Injector);
  const partnerId = inject(PartnerService).getPartner()?.id;
  const posHandoffService = inject(OdooPosHandoffService);
  const spinnerService = inject(SpinnerService);
  const storageService = inject(TicketingOnsiteSetupStorageService);

  const onsiteSetup = storageService.getOnsiteSetupConfig();
  const channelId = onsiteSetup?.channel_id;

  if (!channelId) {
    return of({ kind: 'setup-required', reason: 'no-config' });
  }

  if (partnerId === undefined) {
    return of({ kind: 'setup-required', reason: 'link-error' });
  }

  spinnerService.show();

  return posHandoffService.resolveRedirectUrl(channelId, onsiteSetup?.id, partnerId).pipe(
    map((link: string): OdooFnbHandOff => {
      afterNextRender(() => document.defaultView?.location.replace(link), { injector });

      return { kind: 'redirecting' };
    }),
    catchError((error: unknown) =>
      of<OdooFnbHandOff>({ kind: 'setup-required', reason: isPointOfSaleNotFoundError(error) ? 'pos-not-found' : 'link-error' }),
    ),
  );
};
