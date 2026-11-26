import { CommonModule, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { ScannerDualScreenService } from '@fz-original/app/app/services/scanner-dual-screen/scanner-dual-screen.service';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { BookingClaimService } from '../../../services/booking/booking-claim.service';
import { BookingSessionService } from '../../../services/booking/booking-session.service';
import { extractOtokenFromUrl } from '../../../services/booking/otoken-url.parser';
import { IdleService } from '../../../services/idle/idle.service';
import { KioskButtonComponent } from '../../../shared/components/button/kiosk-button.component';
import { KioskHeroComponent } from '../../../shared/components/kiosk-hero/kiosk-hero.component';
import { KioskNavigationService } from '../../../shared/kiosk-navigation.service';

/**
 * Walk-up entry to native booking management. The customer identifies their
 * booking by scanning the printed QR (which encodes the booking-portal URL
 * with the otoken) or by typing the booking reference (claim code). Either way
 * we end with an otoken, start the session and open the native booking list.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, IgntInputFieldComponent, KioskButtonComponent, KioskHeroComponent, TranslateModule],
  selector: 'app-booking-claim',
  standalone: true,
  styleUrls: ['./booking-claim.component.scss'],
  templateUrl: './booking-claim.component.html',
})
export class BookingClaimComponent implements OnInit {
  readonly #scanner = inject(ScannerDualScreenService);
  readonly #claimService = inject(BookingClaimService);
  readonly #sessionService = inject(BookingSessionService);
  readonly #idleService = inject(IdleService);
  readonly #navigationService = inject(KioskNavigationService);
  readonly #destroyRef = inject(DestroyRef);

  readonly hasError = signal(false);
  readonly referenceControl = new FormControl('');
  readonly uppercasePipe = new UpperCasePipe();

  readonly #referenceValue = toSignal(this.referenceControl.valueChanges, { initialValue: '' });
  readonly canContinue = computed(() => (this.#referenceValue() ?? '').trim().length > 0);

  readonly #claimCode$ = new Subject<string>();

  goHome(): void {
    this.#navigationService.navigateHome();
  }

  ngOnInit(): void {
    this.#idleService
      .get(60)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#sessionService.endSession());
    this.#scanner
      .observeScanCode()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(scanned => this.#onScan(scanned));
    this.#claimCode$
      .pipe(
        switchMap(code =>
          this.#claimService.claimByCode(code).pipe(
            catchError(() => {
              this.hasError.set(true);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(otoken => this.#startBookingSession(otoken));
  }

  submitReference(): void {
    const code = (this.referenceControl.value ?? '').trim().toUpperCase();
    if (code) {
      this.#claimByCode(code);
    }
  }

  #claimByCode(code: string): void {
    this.hasError.set(false);
    this.#claimCode$.next(code);
  }

  #onScan(scanned: string): void {
    const otoken = extractOtokenFromUrl(scanned);
    if (otoken) {
      this.#startBookingSession(otoken);
      return;
    }
    this.#claimByCode(scanned.trim().toUpperCase());
  }

  #startBookingSession(otoken: string): void {
    this.#sessionService.startSession(otoken);
    this.#navigationService.navigateBookingList();
  }
}
