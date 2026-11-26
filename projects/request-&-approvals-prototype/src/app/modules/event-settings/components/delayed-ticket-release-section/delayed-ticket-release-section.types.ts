import { FormControl, FormGroup } from '@angular/forms';

import { DurationUnit } from '@fz-original/app/shared/ticket-delivery-settings/models/duration-unit.enum';

export interface DelayedTicketReleaseFormValue {
  durationAmount: number | null;
  durationUnit: DurationUnit;
  enabled: boolean;
  isSeatingBlocked: boolean;
  releaseDatetime: string;
  releaseMode: 'ONE_TIME' | 'PER_TIME_SLOT';
  releaseTimingEnabled: boolean;
  ruleName: string;
  settingsId: string | null;
}

export type DelayedTicketReleaseFormGroup = FormGroup<{
  durationAmount: FormControl<number | null>;
  durationUnit: FormControl<DurationUnit>;
  enabled: FormControl<boolean>;
  isSeatingBlocked: FormControl<boolean>;
  releaseDatetime: FormControl<string>;
  releaseMode: FormControl<'ONE_TIME' | 'PER_TIME_SLOT'>;
  releaseTimingEnabled: FormControl<boolean>;
  ruleName: FormControl<string>;
  settingsId: FormControl<string | null>;
}>;
