import { InjectionToken } from '@angular/core';

import AutoNumeric from 'autonumeric';

export interface NumericFormatter {
  update(options: AutoNumeric.Options): void;
  detach(): void;
  getNumericString(): string | null;
  set(value: number): void;
}

export interface NumericFormatterFactory {
  create(elementOrSelector: HTMLInputElement, initialValue?: string, options?: AutoNumeric.Options): NumericFormatter;

  format(value: number, options: AutoNumeric.Options): string;
}

export const NUMERIC_FORMATTER_FACTORY = new InjectionToken<NumericFormatterFactory>('numeric_formatter_factory');
