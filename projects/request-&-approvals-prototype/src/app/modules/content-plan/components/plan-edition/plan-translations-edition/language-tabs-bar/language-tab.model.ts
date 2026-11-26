export type LanguageTabStatus = 'complete' | 'missing' | 'unknown';

export interface LanguageTab {
  code: string;
  isDefault: boolean;
  name: string;
  status: LanguageTabStatus;
  totalFieldCount?: number;
  translatedFieldCount?: number;
}
