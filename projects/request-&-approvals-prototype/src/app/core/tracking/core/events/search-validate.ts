import { ValidationTypeEnum } from '../../../../modules/validation/enums/validation-type.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SearchValidateData {
  validation_type: ValidationTypeEnum;
  input_type: 'manual' | 'scanned';
  input: string;
}

export class SearchValidateEvent extends TrackingEvent<SearchValidateData> {
  constructor(readonly data: SearchValidateData) {
    super(TrackingEvents.SearchValidate, data);
  }
}
