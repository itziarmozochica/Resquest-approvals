export interface BookingAnswer {
  id: number;
  bookingQuestionId: string;
  mainPlanId?: number | null;
  ticketIndex: number;
  value: string[];
  codeId: number | null;
}
