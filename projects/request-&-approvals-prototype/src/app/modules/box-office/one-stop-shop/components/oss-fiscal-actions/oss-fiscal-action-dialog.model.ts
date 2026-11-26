import { Observable } from 'rxjs';

export interface FiscalActionInputConfig {
  label: string;
  placeholder: string;
}

export type FiscalActionSource = Observable<unknown> | ((inputValue: string) => Observable<unknown>);

export interface OssFiscalActionDialogData {
  actionLabel: string;
  actionSource: FiscalActionSource;
  inputConfig?: FiscalActionInputConfig;
}

export type DialogPhase = 'input' | 'loading' | 'result';
