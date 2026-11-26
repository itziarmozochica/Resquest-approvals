import { IdData, TitleData } from '@fz-original/app/shared/models/data/data.model';

import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { LoadModifyReservationData } from './load-modify-reservation-data';

export interface LoadIncreaseReservationEventData {
  isDefaultFilter: boolean;
  selectedCity: IdData<number> & TitleData;
  selectedPlace: IdData<number> & TitleData;
  selectedPlan: IdData<number> & TitleData;
  hasResult: boolean;
}

export class LoadIncreaseReservationEvent extends TrackingEvent<LoadModifyReservationData> {
  constructor(readonly data: LoadModifyReservationData) {
    super(TrackingEvents.LoadIncreaseReservation, data);
  }
}
