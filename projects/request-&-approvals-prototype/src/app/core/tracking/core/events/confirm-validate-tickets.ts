import { ValidationTypeEnum } from '../../../../modules/validation/enums/validation-type.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ConfirmValidateTicketsData {
  validation_type: ValidationTypeEnum;
  input_type: 'manual' | 'scanned';
  input: string;
  order: number;
  type?: 'ticket' | 'code';
  ticketId?: number;
  ticketCount?: number;
  codes?: Array<string>;
  obo_flow_type?: string;
}

export class ConfirmValidateTicketsEvent extends TrackingEvent<ConfirmValidateTicketsData> {
  constructor(readonly data: ConfirmValidateTicketsData) {
    super(TrackingEvents.ConfirmValidateTickets, data);
  }
}
