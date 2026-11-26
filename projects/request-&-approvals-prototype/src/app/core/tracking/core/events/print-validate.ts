import { ValidationTypeEnum } from '../../../../modules/validation/enums/validation-type.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface PrintValidateData {
  validation_type: ValidationTypeEnum;
  input_type: 'manual' | 'scanned';
  order: number;
  input: string;
  type?: 'order' | 'ticket';
  ticketId?: number;
}

export class PrintValidateEvent extends TrackingEvent<PrintValidateData> {
  constructor(readonly data: PrintValidateData) {
    super(TrackingEvents.PrintValidate, data);
  }
}
