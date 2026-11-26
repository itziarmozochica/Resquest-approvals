import { SessionType } from '@fz-original/app/shared/models/session-type/session-type.model';

export interface BookingQuestionTicketDetails {
  label: string;
  mainPlanId?: number;
  sessionType: SessionType;
}
