export interface TranslationsContextData {
  partnerId: number;
  planId: number;
}

export type TranslationsErrorOperation = 'add' | 'delete' | 'save';

export type TranslationsErrorType = 'server' | 'validation';

export interface TranslationsErrorPayload {
  channelId: string | null;
  errorMessage: string;
  errorType: TranslationsErrorType;
  field: string;
  languageCode: string | null;
  operation: TranslationsErrorOperation;
}
