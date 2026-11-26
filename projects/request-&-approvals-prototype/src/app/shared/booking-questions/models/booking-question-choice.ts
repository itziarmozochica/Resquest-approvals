export interface BookingQuestionChoice {
  value: string;
  label: string;
  additionalQuestion: {
    message: string;
  } | null;
  order?: number;
}
