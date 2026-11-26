import { inject, InjectionToken } from '@angular/core';

import { FzAssistantCheckboxNativeValueWriterService } from './fz-assistant-checkbox-native-value-writer.service';
import { FzAssistantNativeValueWriter } from './fz-assistant-native-value-writer.model';
import { FzAssistantRadioNativeValueWriterService } from './fz-assistant-radio-native-value-writer.service';
import { FzAssistantScalarNativeValueWriterService } from './fz-assistant-scalar-native-value-writer.service';
import { FzAssistantSelectNativeValueWriterService } from './fz-assistant-select-native-value-writer.service';

/**
 * The ordered set of native value writers the adapter offers an element to, first match wins.
 *
 * Defaulted at the root injector rather than assembled by `provideFzAssistantDi()`, because the
 * adapter that injects it is `providedIn: 'root'` and so promises to be constructible from any
 * injector. As a set of `multi` providers it was not: injecting the adapter without that call
 * threw `NullInjectorError`, and the writer classes it names are root-provided already, so the
 * token was the only piece of the write path that had to be handed in.
 *
 * A factory rather than `multi` providers also puts the order in one readable place. Precedence is
 * the whole contract of a first-match set, and with `multi` it fell out of provider registration
 * order across files. Overriding the set is a plain `useValue` on this token, which replaces it as
 * a whole - the same thing a `multi` override did, minus the appearance of appending to it.
 *
 * The token lives here and not beside `FzAssistantNativeValueWriter` because the default set names
 * the four services, and each of those imports that interface: a factory in the model file would
 * close the import cycle.
 */
export const FZ_ASSISTANT_NATIVE_VALUE_WRITERS = new InjectionToken<readonly FzAssistantNativeValueWriter[]>(
  'FZ_ASSISTANT_NATIVE_VALUE_WRITERS',
  {
    factory: () => [
      inject(FzAssistantCheckboxNativeValueWriterService),
      inject(FzAssistantRadioNativeValueWriterService),
      inject(FzAssistantScalarNativeValueWriterService),
      inject(FzAssistantSelectNativeValueWriterService),
    ],
    providedIn: 'root',
  },
);
