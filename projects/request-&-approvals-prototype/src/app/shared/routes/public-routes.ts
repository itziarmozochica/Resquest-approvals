import { inject, Injectable } from '@angular/core';
import { Router, Routes } from '@angular/router';

import { RoutesFactory } from './app-routes';

@Injectable({
  providedIn: 'root',
})
export class PublicRoutesFactory extends RoutesFactory {
  static getRoutes(): Routes {
    return [
      {
        path: 'kiosk',
        loadComponent: async () =>
          await import('../../modules/kiosk/components/kiosk.component')
            .then(m => m.KioskComponent)
            .catch((err: unknown) => PublicRoutesFactory.reloadIfChunkLoadError(err)),
      },
      {
        path: 'download-qr-ticket',
        loadComponent: async () =>
          await import('../../modules/download-qr-ticket/components/download-qr-ticket/download-qr-ticket.component')
            .then(m => m.DownloadQrTicketComponent)
            .catch((err: unknown) => PublicRoutesFactory.reloadIfChunkLoadError(err)),
      },
      {
        path: 'ambassadors',
        loadChildren: async () =>
          await import('../../modules/ambassador-register/ambassador-register.module')
            .then(m => m.AmbassadorRegisterModule)
            .catch((err: unknown) => PublicRoutesFactory.reloadIfChunkLoadError(err as { name?: string })),
      },
      {
        path: 'ambassador-programs',
        loadChildren: async () =>
          await import('../../modules/ambassador-register/ambassador-program-register.module')
            .then(m => m.AmbassadorProgramRegisterModule)
            .catch((err: unknown) => PublicRoutesFactory.reloadIfChunkLoadError(err as { name?: string })),
      },
      {
        path: 'support',
        loadChildren: async () =>
          await import('../../modules/support/support.module')
            .then(m => m.SupportModule)
            .catch((err: unknown) => PublicRoutesFactory.reloadIfChunkLoadError(err as { name?: string })),
      },
      /**
       * Retired setup paths. Setup moved into the authenticated app, but invite links are still in
       * partners' inboxes and a provider callback can still land here from an environment running
       * the previous `MEMBERSHIP_CONNECT_RESULT_PATH`. Both send the partner to the real page
       * rather than a blank one.
       *
       * The invite redirect drops the query string on purpose — it carries the connect token, which
       * has no business being copied into another URL. The callback redirect has to rebuild the
       * query string by hand, because a plain `redirectTo` string discards it and the outcome the
       * partner needs to read lives in `status` and `reason`.
       */
      {
        path: 'memberships/connect',
        pathMatch: 'full',
        redirectTo: '/memberships/connections',
      },
      {
        path: 'memberships/connect/result',
        redirectTo: ({ queryParams }) => inject(Router).createUrlTree(['/memberships/connections'], { queryParams }),
      },
    ];
  }
}
