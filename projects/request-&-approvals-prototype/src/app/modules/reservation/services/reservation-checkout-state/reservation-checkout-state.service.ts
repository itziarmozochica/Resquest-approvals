import { Injectable } from '@angular/core';

import { Constructor } from '@fz-original/app/app/mixins/constructor';
import { emptyBase } from '@fz-original/app/app/mixins/empty';
import { StateMixin } from '@fz-original/app/app/mixins/state/state.mixin';

import { ReservationCheckoutState } from '../../models/reservation-checkout-state.model';
import { reservationCheckoutStateInitial } from './reservation-checkout-state.initial';

@Injectable({ providedIn: 'root' })
export class ReservationCheckoutStateService extends StateMixin<Constructor, ReservationCheckoutState>(
  emptyBase,
  reservationCheckoutStateInitial,
) {}
