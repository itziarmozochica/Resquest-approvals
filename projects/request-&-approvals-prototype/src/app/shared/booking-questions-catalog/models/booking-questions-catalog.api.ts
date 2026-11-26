import { CatalogCategory } from './catalog-category.enum';
import { CustomerQuestionType } from './customer-question-type.enum';

export interface ApiBookingQuestionCapabilities {
  can_assign: boolean;
  can_delete: boolean;
  can_modify: boolean;
  can_view_answers: boolean;
  can_view_details: boolean;
}

export interface ApiBookingQuestionChoice {
  additional_question_message: string | null;
  id: string;
  include_additional_question: boolean;
  label: string;
  order: number | null;
}

export interface ApiBookingQuestionItem {
  allowed_capabilities: ApiBookingQuestionCapabilities;
  catalog_category: CatalogCategory;
  choices: ApiBookingQuestionChoice[] | null;
  id: string;
  label: string;
  message: string;
  type: CustomerQuestionType;
  validation_regex: string | null;
}

export interface ApiFindBookingQuestionsData {
  items: ApiBookingQuestionItem[];
  limit: number;
  offset: number;
  total_count: number;
}

export interface ApiFindBookingQuestionsResponse {
  data: ApiFindBookingQuestionsData | null;
  error: { code: number; message: string } | null;
}

export interface ApiGetBookingQuestionResponse {
  data: ApiBookingQuestionItem | null;
  error: { code: number; message: string } | null;
}

export interface ApiBookingQuestionChoiceInput {
  label: string;
  additional_question_message?: string | null;
  include_additional_question?: boolean;
  order?: number | null;
}

export interface ApiCreateBookingQuestionRequest {
  label: string;
  message: string;
  type: CustomerQuestionType;
  choices?: ApiBookingQuestionChoiceInput[] | null;
  validation_regex?: string | null;
}

export interface ApiUpdateBookingQuestionRequest {
  label: string;
  message: string;
  choices?: ApiBookingQuestionChoiceInput[] | null;
  validation_regex?: string | null;
}

export interface ApiBookingQuestionMutationData {
  booking_question_id: string;
}

export interface ApiBookingQuestionMutationResponse {
  data: ApiBookingQuestionMutationData | null;
  error: { code: number; message: string } | null;
}

export interface ApiGetAllowedCapabilitiesResponse {
  data: ApiBookingQuestionCapabilities | null;
  error: { code: number; message: string } | null;
}
