import { InjectionToken } from '@angular/core';

/**
 * Marks an application as able to hold a distributor session. Provided by
 * `provideBusinessInitialization()`, so registering the feature is what declares the capability —
 * there is no second list to keep in sync.
 *
 * An application that does not register it (the kiosk, for one) has nothing that could ever resolve
 * the session, so {@link DistributorSessionStore} starts settled rather than leaving every gate
 * keyed on it waiting for an answer that is never coming.
 */
export const DISTRIBUTOR_SESSION_CAPABLE = new InjectionToken<boolean>('DISTRIBUTOR_SESSION_CAPABLE');
