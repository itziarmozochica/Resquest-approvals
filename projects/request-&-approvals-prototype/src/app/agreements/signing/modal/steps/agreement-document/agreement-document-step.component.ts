import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';

import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule } from '@ngx-translate/core';

import { SignerRole } from '../../../../requirements/enums/signer-role.enum';
import { isPlainTextLegalContent } from '../../../../utils/agreement-format.util';
import { IndividualAgreementStatus } from '../../../enums/individual-agreement-status.enum';
import { SignContextAgreement } from '../../../models/agreement-sign-context.model';
import { OrderAgreementSigner } from '../../../models/order-agreement-signer.model';
import { AgreementSigningStore } from '../../../services/agreement-signing.store';

/**
 * Read-only rendering of the selected agreement's sign context: the exact legal text the
 * participant accepts, fetched live from the Agreement Service.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IgntAlertComponent, IgntButtonComponent, IgntCheckboxComponent, TranslateModule],
  selector: 'app-agreement-document-step',
  standalone: true,
  styleUrl: './agreement-document-step.component.scss',
  templateUrl: './agreement-document-step.component.html',
})
export class AgreementDocumentStepComponent {
  protected readonly store = inject(AgreementSigningStore);
  protected readonly signerRole = SignerRole;

  protected readonly agreement: Signal<SignContextAgreement | null> = computed(() => this.store.signContext()?.agreements[0] ?? null);
  protected readonly hasAcknowledged: WritableSignal<boolean> = signal(false);
  protected readonly isAlreadySigned: Signal<boolean> = computed(
    () => this.store.selectedAgreement()?.status === IndividualAgreementStatus.signed,
  );
  protected readonly isPlainText: Signal<boolean> = computed(() => isPlainTextLegalContent(this.agreement()?.legalText ?? ''));
  protected readonly signer: Signal<OrderAgreementSigner | null> = computed(() => {
    const selectedAgreementId = this.store.selectedAgreementId();
    return this.store.signers().find((entry: OrderAgreementSigner) => entry.individualAgreementId === selectedAgreementId) ?? null;
  });

  constructor() {
    this.#loadSelected();
  }

  protected retry(): void {
    this.store.retryDocument();
  }

  #loadSelected(): void {
    const individualAgreementId = this.store.selectedAgreementId();
    if (individualAgreementId !== null) {
      this.store.loadSignContext(individualAgreementId);
    }
  }

  protected continueToSign(): void {
    if (this.agreement() === null || !this.hasAcknowledged() || this.isAlreadySigned()) {
      return;
    }
    this.store.transition('continueToSign');
  }
}
