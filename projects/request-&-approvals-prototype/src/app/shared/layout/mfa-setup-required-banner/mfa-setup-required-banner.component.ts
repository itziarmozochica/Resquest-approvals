import { formatDate } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  LOCALE_ID,
  output,
  Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IgntAlertComponent, IgntAlertSentiment, IgntButtonComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { AuthenticatedMfaEnrollmentDialogService } from '../../../modules/user/authenticated-mfa-enrollment/authenticated-mfa-enrollment-dialog.service';
import { MfaLearnMoreDialogService } from '../../../modules/user/mfa-learn-more/mfa-learn-more-dialog.service';
import { userMfaPolicyStatus, UserMfaStatus } from '../../models/user/user-mfa.model';
import { UserMfaStatusService } from '../../services/user/user-mfa-status.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, IgntButtonComponent, TranslateModule],
  selector: 'app-mfa-setup-required-banner',
  styleUrl: './mfa-setup-required-banner.component.scss',
  templateUrl: './mfa-setup-required-banner.component.html',
})
export class MfaSetupRequiredBannerComponent {
  readonly #authenticatedMfaEnrollmentDialog = inject(AuthenticatedMfaEnrollmentDialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #elementRef = inject(ElementRef<HTMLElement>);
  readonly #locale = inject(LOCALE_ID);
  readonly #mfaLearnMoreDialog = inject(MfaLearnMoreDialogService);
  readonly #userMfaStatus = inject(UserMfaStatusService);

  readonly #isGraceExpired: Signal<boolean> = computed((): boolean => {
    const status: UserMfaStatus | null = this.#userMfaStatus.status();

    return status?.policy.status === userMfaPolicyStatus.required;
  });

  /**
   * Reports the banner host height in CSS pixels so the layout can reserve sticky chrome space.
   * Clearing the reservation is owned by the layout (`showMfaSetupRequiredBanner`).
   */
  readonly heightChange = output<number>();

  protected readonly alertSentiment: Signal<IgntAlertSentiment> = computed((): IgntAlertSentiment => {
    return this.#isGraceExpired() ? 'danger' : 'warning';
  });

  protected readonly titleKey: Signal<string> = computed((): string => {
    return this.#isGraceExpired() ? 'layout.mfaSetupRequiredBanner.titleExpired' : 'layout.mfaSetupRequiredBanner.title';
  });

  protected readonly titleParams = computed((): Readonly<{ date: string }> => {
    const enforcedAt: string | null = this.#userMfaStatus.enforcedAt();

    if (enforcedAt === null) {
      return { date: '' };
    }

    return { date: formatDate(enforcedAt, 'd MMM y', this.#locale) };
  });

  #lastEmittedHeightPx = Number.NaN;

  constructor() {
    afterNextRender((): void => {
      const host: HTMLElement = this.#elementRef.nativeElement;
      this.#emitHostHeight(host);

      if (typeof ResizeObserver === 'undefined') {
        return;
      }

      const observer: ResizeObserver = new ResizeObserver((): void => {
        this.#emitHostHeight(host);
      });
      observer.observe(host);

      this.#destroyRef.onDestroy((): void => {
        observer.disconnect();
      });
    });
  }

  protected onLearnMoreClicked(): void {
    this.#mfaLearnMoreDialog.open().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  protected onSetupClicked(): void {
    this.#authenticatedMfaEnrollmentDialog.open().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  #emitHostHeight(host: HTMLElement): void {
    const heightPx: number = Math.ceil(host.getBoundingClientRect().height);
    this.#emitHeight(heightPx);
  }

  #emitHeight(heightPx: number): void {
    if (Object.is(this.#lastEmittedHeightPx, heightPx)) {
      return;
    }

    this.#lastEmittedHeightPx = heightPx;
    this.heightChange.emit(heightPx);
  }
}
