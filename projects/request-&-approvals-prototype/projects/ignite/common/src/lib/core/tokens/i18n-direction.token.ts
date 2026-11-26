import { InjectionToken, signal, type Signal } from '@angular/core';

import type { I18nDirection } from '../models/i18n-direction.model';

/** App-wide text direction as a signal. Host apps can override this provider. */
export const I18N_DIRECTION = new InjectionToken<Signal<I18nDirection>>('I18N_DIRECTION', {
  providedIn: 'root',
  factory: (): Signal<I18nDirection> => signal<I18nDirection>('ltr'),
});
