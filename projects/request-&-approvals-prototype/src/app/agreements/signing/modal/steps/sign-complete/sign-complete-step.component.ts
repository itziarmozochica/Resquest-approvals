import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';

import type { MultiStepModalResult } from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal.model';
import { IGNT_DIALOG_REF, IgntButtonComponent, type IgntDialogRef } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { SignReceipt } from '../../../models/sign-receipt.model';
import { AgreementSigningStore } from '../../../services/agreement-signing.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IgntButtonComponent, IgntIconComponent, TranslateModule],
  selector: 'app-sign-complete-step',
  standalone: true,
  styleUrl: './sign-complete-step.component.scss',
  templateUrl: './sign-complete-step.component.html',
})
export class SignCompleteStepComponent {
  readonly #dialogRef = inject<IgntDialogRef<MultiStepModalResult>>(IGNT_DIALOG_REF);
  protected readonly store = inject(AgreementSigningStore);

  protected readonly receipt: Signal<SignReceipt | null> = computed(() => this.store.signReceipt());

  protected finish(): void {
    if (this.store.isOpenedForOneAgreement()) {
      this.#dialogRef.close({ abandoned: false, completed: true });
      return;
    }
    this.store.finishSigning();
  }
}
