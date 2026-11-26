import { InjectionToken } from '@angular/core';

export const STEPPER_DEPTH = new InjectionToken<number>('STEPPER_DEPTH', {
  providedIn: 'root',
  factory: () => 0,
});

export const STEPPER_MAX_DEPTH = 1;
