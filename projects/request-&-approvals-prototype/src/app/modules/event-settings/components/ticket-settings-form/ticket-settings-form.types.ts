import { FormControl, FormGroup } from '@angular/forms';

import {
  DelayedTicketReleaseFormGroup,
  DelayedTicketReleaseFormValue,
} from '../delayed-ticket-release-section/delayed-ticket-release-section.types';

export interface TicketSettingsFormValue {
  allowInvitationReselling: boolean;
  delayedTicketRelease: DelayedTicketReleaseFormValue;
  resellingProvider: string | null;
}

export type TicketSettingsFormGroup = FormGroup<{
  allowInvitationReselling: FormControl<boolean>;
  delayedTicketRelease: DelayedTicketReleaseFormGroup;
  resellingProvider: FormControl<string | null>;
}>;
