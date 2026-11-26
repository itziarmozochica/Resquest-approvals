import { FormControl, FormGroup, Validators } from '@angular/forms';

import { integerValidator } from '@fz-original/app/shared/validators/integer.validator';
import { merge, Observable, of } from 'rxjs';
import { distinctUntilChanged, map, tap } from 'rxjs/operators';

import { outflowValidator } from '../../../services/waiting-room/outflow/outflow.validator';
import { initialWaitingRoomValues, minutesInPreQueueRange } from './waiting-room-section.constants';
import type { WaitingRoomFormGroup } from './waiting-room-section.types';

export function hasWaitingRoomId(waitingRoomId: string | null | undefined): waitingRoomId is string {
  return typeof waitingRoomId === 'string' && waitingRoomId.trim().length > 0;
}

export function watchControlValue$<T>(control: FormControl<T>): Observable<T> {
  return merge(of(control.value), control.valueChanges);
}

export function disableFieldsWhenWrExists$(form: WaitingRoomFormGroup): Observable<boolean> {
  return watchControlValue$(form.controls.waitingRoomId).pipe(
    map(id => hasWaitingRoomId(id)),
    distinctUntilChanged(),
    tap(shouldDisable => {
      setWaitingRoomDetailFieldsDisabled(form, shouldDisable);
    }),
  );
}

export function setWaitingRoomDetailFieldsDisabled(form: WaitingRoomFormGroup, isDisabled: boolean): void {
  const { launchingDatetime, language, minutesInPreQueue, timezone, visibilityMode, waitingRoomName } = form.controls;

  const detailControls = [waitingRoomName, launchingDatetime, timezone, minutesInPreQueue, visibilityMode, language];

  for (const control of detailControls) {
    if (isDisabled) {
      control.disable({ emitEvent: false });
    } else {
      control.enable({ emitEvent: false });
    }
  }

  syncWaitingRoomValidatorsForEnabledState(form);
}

export function syncWaitingRoomValidatorsForEnabledState(form: WaitingRoomFormGroup): void {
  const { enabled, launchingDatetime, language, maxOutflow, minutesInPreQueue, timezone, visibilityMode, waitingRoomName } = form.controls;
  const isEnabled = enabled.value;

  // Enable or clear required validators.
  if (isEnabled) {
    launchingDatetime.setValidators([Validators.required]);
    language.setValidators([Validators.required]);
    maxOutflow.setValidators([integerValidator, outflowValidator()]);
    minutesInPreQueue.setValidators([
      Validators.required,
      integerValidator,
      Validators.min(minutesInPreQueueRange.minMinutes),
      Validators.max(minutesInPreQueueRange.maxMinutes),
    ]);
    timezone.setValidators([Validators.required]);
    visibilityMode.setValidators([Validators.required]);
    waitingRoomName.setValidators([Validators.required]);
  } else {
    launchingDatetime.clearValidators();
    language.clearValidators();
    maxOutflow.clearValidators();
    minutesInPreQueue.clearValidators();
    timezone.clearValidators();
    visibilityMode.clearValidators();
    waitingRoomName.clearValidators();
  }

  const detailControls = [launchingDatetime, language, maxOutflow, minutesInPreQueue, timezone, visibilityMode, waitingRoomName];

  // If enabled: untouch before revalidate; always revalidate.
  for (const control of detailControls) {
    if (isEnabled) {
      control.markAsUntouched({ emitEvent: false });
    }
    control.updateValueAndValidity({ emitEvent: false });
  }
}

export function resetWaitingRoomFormFieldsForChannelChange(form: WaitingRoomFormGroup): void {
  const channelId = form.controls.channelId.value;
  form.reset(
    {
      ...initialWaitingRoomValues,
      channelId,
    },
    { emitEvent: true },
  );
  syncWaitingRoomValidatorsForEnabledState(form);
}

export function createWaitingRoomFormGroup(): WaitingRoomFormGroup {
  const controls: WaitingRoomFormGroup['controls'] = {
    channelId: new FormControl(initialWaitingRoomValues.channelId, { nonNullable: true }),
    enabled: new FormControl(initialWaitingRoomValues.enabled, { nonNullable: true }),
    language: new FormControl(initialWaitingRoomValues.language, { nonNullable: true }),
    launchingDatetime: new FormControl<string | null>(initialWaitingRoomValues.launchingDatetime),
    maxOutflow: new FormControl<number | null>(initialWaitingRoomValues.maxOutflow, { validators: [integerValidator, outflowValidator()] }),
    minutesInPreQueue: new FormControl(initialWaitingRoomValues.minutesInPreQueue, { nonNullable: true }),
    timezone: new FormControl(initialWaitingRoomValues.timezone, { nonNullable: true }),
    visibilityMode: new FormControl(initialWaitingRoomValues.visibilityMode, { nonNullable: true }),
    waitingRoomId: new FormControl<string | null>(initialWaitingRoomValues.waitingRoomId),
    waitingRoomName: new FormControl(initialWaitingRoomValues.waitingRoomName, { nonNullable: true }),
  };

  const form = new FormGroup(controls) as WaitingRoomFormGroup;
  syncWaitingRoomValidatorsForEnabledState(form);

  return form;
}
