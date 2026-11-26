export interface ReservationPlanSummaryApi {
  available_languages: string[];
  default_language: string | null;
  has_booking_questions: boolean;
  id: number;
  name: string;
}

export interface ReservationPlanSummary {
  readonly availableLanguages: readonly string[];
  readonly defaultLanguage: string | null;
  readonly hasBookingQuestions: boolean;
  readonly id: number;
  readonly name: string;
}
