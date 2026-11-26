import { TemplateRef } from '@angular/core';

export interface IgntTourStep {
  content: string;
  contentTemplate?: TemplateRef<unknown>;
  finishText?: string;
  isLast?: boolean;
  nextText?: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  prevText?: string;
  stepIdentifier: string;
  title: string;
}

export interface IgntTourConfig {
  continueOnError?: boolean;
  currentStepIndex?: number;
  showProgress?: boolean;
  steps: IgntTourStep[];
  tourStorageKey: string;
}
