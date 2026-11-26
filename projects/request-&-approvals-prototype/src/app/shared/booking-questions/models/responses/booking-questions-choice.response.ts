export interface BookingQuestionsChoiceResponse {
  value: string;
  label: string;
  additional_question?: {
    message: string;
  };
  order: number;
}
