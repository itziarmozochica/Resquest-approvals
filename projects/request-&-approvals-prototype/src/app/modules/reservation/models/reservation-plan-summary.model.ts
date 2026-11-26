export interface ReservationPlanSummary {
  availableLanguages: string[];
  defaultLanguage: string | null;
  hasBookingQuestions: boolean;
  id: number;
  name: string;
}
