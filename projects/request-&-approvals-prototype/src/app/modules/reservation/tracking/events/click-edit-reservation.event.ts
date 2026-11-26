import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { EditReservationAction } from '../../models/edit-reservation-action.enum';
import { ModifyReservationEventData } from '../models/modify-reservation-event-data.model';

export interface ClickEditReservationData extends ModifyReservationEventData {
  action: EditReservationAction;
}

export const clickEditReservation = defineEvent<ClickEditReservationData>('click.editReservation');
