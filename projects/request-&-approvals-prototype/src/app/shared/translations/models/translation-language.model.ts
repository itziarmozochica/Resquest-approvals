export interface TranslationLanguageDTO {
  code: string;
  locale: string;
  name: string;
}

export interface TranslationLanguage {
  code: string;
  locale: string;
  name: string;
}

export interface TranslationLanguagesResponseDTO {
  data?: TranslationLanguageDTO[] | null;
  error?: unknown;
}
