import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs/operators';

import { ImpersonationService } from '../../../core/authentication/impersonation.service';
import { ToastService } from '../../services/toast/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-impersonation-banner',
  standalone: true,
  styleUrls: ['./impersonation-banner.component.scss'],
  templateUrl: './impersonation-banner.component.html',
})
export class ImpersonationBannerComponent {
  readonly #impersonationService = inject(ImpersonationService);
  readonly #toastService = inject(ToastService);
  readonly #translate = inject(TranslateService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #isStopping = signal(false);
  readonly #impersonatedUserName: Signal<string> = this.#impersonationService.impersonatedUserName;
  readonly #impersonatedUserRole: Signal<string> = this.#impersonationService.impersonatedUserRole;
  readonly #roleLabel = computed(() => {
    const role = this.#impersonatedUserRole();

    if (role.length === 0) {
      return '';
    }

    return ` (${role})`;
  });
  protected readonly displayUser = computed(() => `${this.#impersonatedUserName()}${this.#roleLabel()}`);
  protected readonly isStopping = this.#isStopping.asReadonly();

  protected stopImpersonation(): void {
    if (this.#isStopping()) {
      return;
    }

    this.#isStopping.set(true);
    this.#impersonationService
      .stop()
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => {
          if (response.error) {
            this.#showStopError(response.error.message);
            return;
          }

          this.#isStopping.set(false);
        },
      });
  }

  #showStopError(message = 'errors.generic'): void {
    this.#toastService.add({
      autoHide: true,
      delay: 3000,
      message: this.#translate.instant(message),
      sentiment: AlertSentiment.danger,
    });
    this.#isStopping.set(false);
  }
}
