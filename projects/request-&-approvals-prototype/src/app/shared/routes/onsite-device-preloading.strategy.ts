import { inject, Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';

import { Observable, of } from 'rxjs';

import { FeverzoneDeviceType } from '../models/device/device.model';
import { DeviceService } from '../services/device/device.service';

@Injectable({ providedIn: 'root' })
export class OnsiteDevicePreloadingStrategy implements PreloadingStrategy {
  readonly #deviceService = inject(DeviceService);

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (route.data?.['preloadOnOnsiteDevice'] !== true) {
      return of(null);
    }
    return this.#deviceService.getFeverzoneDeviceType() === FeverzoneDeviceType.desktop ? of(null) : load();
  }
}
