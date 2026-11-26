import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, type Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';
import { timer } from 'rxjs';
import { take } from 'rxjs/operators';

import { CheckoutStore } from '../../store/checkout.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntIconComponent, TranslateModule],
  selector: 'app-confirmation-step',
  standalone: true,
  styleUrl: './confirmation-step.component.scss',
  templateUrl: './confirmation-step.component.html',
})
export class ConfirmationStepComponent {
  static readonly closeDelayMs = 1000;
  readonly #destroyRef = inject(DestroyRef);
  readonly #store = inject(CheckoutStore);

  protected readonly cancelCameTooLate: Signal<boolean> = computed(() => this.#store.context().tapToPayCancelRequested);

  constructor() {
    if (this.cancelCameTooLate()) {
      return;
    }
    timer(ConfirmationStepComponent.closeDelayMs)
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#store.completeCheckout());
  }

  protected onContinue(): void {
    this.#store.completeCheckout();
  }
}
