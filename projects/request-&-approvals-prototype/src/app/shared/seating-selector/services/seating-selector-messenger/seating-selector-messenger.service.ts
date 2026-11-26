import { Injectable, NgZone } from '@angular/core';

import { SeatingSelectorMessenger } from './seating-selector-messenger';

@Injectable()
export class SeatingSelectorMessengerService {
  constructor(private ngZone: NgZone) {}

  create(): SeatingSelectorMessenger {
    return new SeatingSelectorMessenger(this.ngZone);
  }
}
