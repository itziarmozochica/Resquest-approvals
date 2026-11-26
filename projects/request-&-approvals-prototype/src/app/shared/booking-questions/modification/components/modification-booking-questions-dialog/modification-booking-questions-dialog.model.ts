import { UntypedFormGroup } from '@angular/forms';

import { BookingQuestion, BookingQuestionsFormData } from '@fz-original/app/shared/booking-questions/models';
import { BookingQuestionTicketDetails } from '@fz-original/app/shared/booking-questions/models/booking-question-ticket-details';

import { ModificationAttendeeRemovalRow } from '../../models/modification-booking-questions.model';
import { ModificationBookingQuestionAnswer } from '../../utils/modification-booking-questions.util';

/** Re-export so dialog + util share one removal-row shape. */
export type ModificationBookingQuestionsRemovalRow = ModificationAttendeeRemovalRow;

export interface ModificationBookingQuestionsDialogData {
  removalRows: ModificationBookingQuestionsRemovalRow[];
  /** Discretionary removals per session type (types with target qty 0 omitted). */
  removalsBySessionTypeId: Readonly<Record<number, number>>;
  removalsRequired: number;
  /** Catalog for the answers form; dialog keeps `frequency === 'per_ticket'` only. */
  questions: BookingQuestion[];
  ticketDetails: BookingQuestionTicketDetails[];
  answersByTicketIndex: Record<number, ModificationBookingQuestionAnswer[]>;
  /** GET passthrough; prefills `perOrderQuestions` and is otherwise forwarded untouched. */
  answersPerOrder: ModificationBookingQuestionAnswer[];
  /** Per-order questions the answers step asks (`selectPerOrderQuestionsToCollect`); usually empty. */
  perOrderQuestions: BookingQuestion[];
}

export type ModificationBookingQuestionsDialogResult =
  | {
      /** Target-aligned; `undefined` marks a new slot with no baseline survivor. */
      keptSourceIndices: Array<number | undefined>;
      formGroup: UntypedFormGroup;
      formData: BookingQuestionsFormData;
    }
  | {
      /** Delete-only: survivors already complete on GET — compile without the answers step. */
      keptSourceIndices: Array<number | undefined>;
      compileFromGet: true;
    }
  | undefined;

export type ModificationBookingQuestionsDialogStep = 'removal' | 'answers';
