import { inject, Injectable } from '@angular/core';

import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { EMPTY, Observable } from 'rxjs';

import { ScannerDualScreenService } from '../scanner-dual-screen/scanner-dual-screen.service';

@Injectable({
  providedIn: 'root',
})
export class ScannerService {
  #dualScreenStorageService = inject(DualScreenStorageService);
  #scannerDualScreenService = inject(ScannerDualScreenService);

  observeScanCode(): Observable<string> {
    if (this.#dualScreenStorageService.containsData()) {
      return this.#scannerDualScreenService.observeScanCode();
    }
    return EMPTY;
  }
}
