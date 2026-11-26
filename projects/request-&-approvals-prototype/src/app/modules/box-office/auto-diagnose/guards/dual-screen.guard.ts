import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';

export const canActivateDualScreen: CanActivateFn = (): boolean | UrlTree =>
  inject(DualScreenStorageService).containsData() || inject(Router).createUrlTree(['/box-office']);
