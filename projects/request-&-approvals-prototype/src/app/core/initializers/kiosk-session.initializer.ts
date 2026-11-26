import { PlatformLocation } from '@angular/common';

import { AuthenticationService } from '../authentication/authentication.service';

const kioskEntryPaths: readonly string[] = ['/kiosk', '/kiosk/'];

export function isKioskEntryPath(pathname: string): boolean {
  return kioskEntryPaths.includes(pathname);
}

export function kioskSessionInitializer(authenticationService: AuthenticationService, platformLocation: PlatformLocation): () => void {
  return (): void => {
    if (!isKioskEntryPath(platformLocation.pathname)) {
      return;
    }

    authenticationService.clearData();
  };
}
