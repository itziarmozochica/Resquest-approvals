import { FormControl, FormGroup } from '@angular/forms';

export interface WaitingRoomFormValue {
  channelId: string;
  enabled: boolean;
  launchingDatetime: string | null;
  language: string;
  maxOutflow: number | null;
  minutesInPreQueue: number;
  timezone: string;
  visibilityMode: string;
  waitingRoomId: string | null;
  waitingRoomName: string;
}

export type WaitingRoomFormGroup = FormGroup<{
  channelId: FormControl<string>;
  enabled: FormControl<boolean>;
  launchingDatetime: FormControl<string | null>;
  language: FormControl<string>;
  maxOutflow: FormControl<number | null>;
  minutesInPreQueue: FormControl<number>;
  timezone: FormControl<string>;
  visibilityMode: FormControl<string>;
  waitingRoomId: FormControl<string | null>;
  waitingRoomName: FormControl<string>;
}>;
