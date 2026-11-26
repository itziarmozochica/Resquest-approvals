import { FormControl, FormGroup } from '@angular/forms';

export interface TransportConfigurationFormValue {
  enabled: boolean;
  externalEventId: string;
  transportProviderId: number | null;
}

export type TransportConfigurationFormGroup = FormGroup<{
  enabled: FormControl<boolean>;
  externalEventId: FormControl<string>;
  transportProviderId: FormControl<number | null>;
}>;
