import type { HttpErrorResponse } from '@angular/common/http';

import type { ImmersiveLayoutDocument } from './immersive-layout-document.model';

export interface TranslateTextsRequest {
  sourceLocale: string;
  targetLocales: string[];
  texts: Record<string, string>;
}

export interface TranslateTextsFailure {
  code: string;
  locale: string;
}

export interface TranslateTextsResponse {
  failed: TranslateTextsFailure[];
  translations: Record<string, Record<string, string>>;
}

export type AutoTranslateChunkResult = TranslateTextsResponse | HttpErrorResponse;

export interface AutoTranslateAction {
  failedLocales: string[];
  kind: 'failed' | 'partial';
}

export interface AutoTranslateOutcome {
  failedLocales: string[];
  translations: Record<string, string>;
}

export type AutoTranslateMode = 'all' | 'missing';

export interface AutoTranslateRequest {
  mode: AutoTranslateMode;
  token: string;
}

export interface AutoTranslatePlan {
  sentTexts: Record<string, string>;
  source: string;
  targets: string[];
}

export interface AutoTranslateResult<T extends ImmersiveLayoutDocument> {
  action: AutoTranslateAction | null;
  working: T;
}
