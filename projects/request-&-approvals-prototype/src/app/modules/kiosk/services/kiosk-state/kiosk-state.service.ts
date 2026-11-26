import { Injectable } from '@angular/core';

import { Constructor } from '@fz-original/app/app/mixins/constructor';
import { emptyBase } from '@fz-original/app/app/mixins/empty';
import { StateMixin } from '@fz-original/app/app/mixins/state/state.mixin';
import { KioskState } from '@fz-original/app/modules/kiosk/models/kiosk-state.model';

import { kioskStateInitial } from './kiosk-state.initial';

@Injectable({
  providedIn: 'root',
})
export class KioskStateService extends StateMixin<Constructor, KioskState>(emptyBase, kioskStateInitial) {}
