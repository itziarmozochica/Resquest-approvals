import { FormControl, FormGroup } from '@angular/forms';

export type CancellationHoursError = 'hoursInteger' | 'hoursRange' | 'hoursRequired';

export interface CancellationSettingsFormControls {
  allowTicketCancellations: FormControl<boolean>;
  hoursBeforeSessionCancellationNotAllowed: FormControl<number | null>;
}

export type CancellationSettingsFormGroup = FormGroup<CancellationSettingsFormControls>;

export interface CancellationSettingsFormHost {
  readonly controls: CancellationSettingsFormControls;
}

export interface CancellationSettingsFormValue {
  allowTicketCancellations: boolean;
  hoursBeforeSessionCancellationNotAllowed: number | null;
}
