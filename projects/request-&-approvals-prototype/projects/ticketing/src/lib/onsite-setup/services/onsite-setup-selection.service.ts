import { inject, Injectable } from '@angular/core';

import { catchError, defer, map, of, tap, type Observable } from 'rxjs';

import type { OnsiteSetup } from '../models/api/onsite-setup.api';
import { ONSITE_SETUP_DEVICE_TYPE_BOX_OFFICE } from '../models/api/onsite-setup.literals';
import type { OnsiteSetupSelection } from '../models/onsite-setup-selection.model';
import { TicketingOnsiteSetupStorageService } from './onsite-setup-storage.service';
import { TicketingOnsiteSetupService } from './onsite-setup.service';
import { TicketingRecentOnsiteSetupsService } from './recent-onsite-setups.service';

type OnsiteSetupStub = Pick<OnsiteSetup, 'device_type' | 'id' | 'name' | 'place_id'>;

@Injectable()
export class TicketingOnsiteSetupSelectionService {
  readonly #onsiteSetupService = inject(TicketingOnsiteSetupService);
  readonly #recentOnsiteSetupsService = inject(TicketingRecentOnsiteSetupsService);
  readonly #storageService = inject(TicketingOnsiteSetupStorageService);

  confirmSelection(selection: OnsiteSetupSelection, partnerId: string, setupTitle: string): Observable<void> {
    return defer(() => {
      this.#recentOnsiteSetupsService.addRecentOnsiteSetup(partnerId, selection.id);

      return this.#onsiteSetupService.getOnsiteSetupByPlace({
        onsiteSetupId: selection.id,
        partnerId,
        placeId: selection.placeId,
      });
    }).pipe(
      tap((setup: OnsiteSetup) => {
        this.#storageService.setOnsiteSetupConfig({ ...setup, place_id: selection.placeId });
      }),
      map((): void => undefined),
      catchError((): Observable<void> => {
        this.#storageService.setOnsiteSetupConfig(stubOnsiteSetup(selection, setupTitle));

        return of(undefined);
      }),
    );
  }
}

function stubOnsiteSetup(selection: OnsiteSetupSelection, setupTitle: string): OnsiteSetup {
  const stub: OnsiteSetupStub = {
    device_type: ONSITE_SETUP_DEVICE_TYPE_BOX_OFFICE,
    id: selection.id,
    name: setupTitle,
    place_id: selection.placeId,
  };

  return stub as OnsiteSetup;
}
