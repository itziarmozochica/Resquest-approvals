import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';

import { DEFAULT_INTERRUPTSOURCES, Idle } from '@ng-idle/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

import { KioskAreYouThereModalComponent } from '../../shared/components/modals/kiosk-are-you-there/kiosk-are-you-there-modal.component';

@Injectable({
  providedIn: 'root',
})
export class IdleService {
  // idle time stands for time when the app is inactive till the modal appears
  #defaultIdleSeconds = 30; // seconds
  // timeout is the time the modal is showing till the user is redirected to home
  #defaultTimeoutSeconds = 30; // seconds
  #subject$: Subject<void> = new Subject<void>();
  #dialogRef: DialogRef<boolean, KioskAreYouThereModalComponent> | null = null;

  #remainingTimeSubject: BehaviorSubject<number> = new BehaviorSubject<number>(this.#defaultTimeoutSeconds);
  #showModalFlag = true; // default is true

  #idle: Idle = inject(Idle);
  #dialog: Dialog = inject(Dialog);

  constructor() {
    this.#initCheckIdle();
  }

  get showModalFlag(): boolean {
    return this.#showModalFlag;
  }

  pause(): void {
    this.#idle.stop();
    this.#idleLog('pause');
  }

  reset(): void {
    this.#idle.watch();
    this.#remainingTimeSubject.next(this.#defaultTimeoutSeconds);
    this.#idleLog('reset');
  }

  /**
   *
   * @param idleSeconds stands for time when the app is inactive till the modal appears
   * @param timeoutSeconds is the time the modal is showing till the user is redirected to home
   * @param showModal either to show the modal to the user to cancel the timeout or not
   */
  get(idleSeconds?: number, timeoutSeconds?: number, showModal: boolean = true): Observable<void> {
    this.#showModalFlag = showModal; // Store the value of showModal flag
    this.#idle.setIdle(idleSeconds ?? this.#defaultIdleSeconds);
    this.#idle.setTimeout(timeoutSeconds ?? this.#defaultTimeoutSeconds);
    this.#idleLog('Started.');
    this.#idle.watch();
    return this.#subject$.asObservable();
  }

  getRemainingTime(): Observable<number> {
    return this.#remainingTimeSubject.asObservable();
  }

  #initCheckIdle(): void {
    this.#idle.setInterrupts(DEFAULT_INTERRUPTSOURCES);
    this.#idle.onIdleStart.subscribe(() => {
      if (this.#idle.getTimeout() === 0) {
        return this.#idle.onTimeout.emit();
      }
      this.#idleLog("You've gone idle!");
      // Check if showModalFlag is true before opening a new one
      if (this.#showModalFlag) {
        this.#dialogRef = this.#dialog.open(KioskAreYouThereModalComponent, {
          autoFocus: false,
        });
      }
    });
    this.#idle.onTimeout.subscribe(() => {
      this.#idleLog('Timed out!');
      this.#subject$.next();
      if (this.#dialogRef !== null) {
        this.#dialogRef.close();
      }
      this.#dialogRef = null;
      this.#remainingTimeSubject.next(this.#defaultTimeoutSeconds);
    });
    this.#idle.onTimeoutWarning.subscribe(countdown => {
      this.#remainingTimeSubject.next(countdown);
    });
  }

  #idleLog(message: string): void {
    console.warn(`[IDLE] ${message}`);
  }
}
