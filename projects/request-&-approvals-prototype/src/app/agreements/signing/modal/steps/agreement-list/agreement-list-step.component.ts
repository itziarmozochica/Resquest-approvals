import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { SignerRole } from '../../../../requirements/enums/signer-role.enum';
import { AgreementSigningStore } from '../../../services/agreement-signing.store';
import { AgreementStatusTagComponent } from '../../components/agreement-status-tag/agreement-status-tag.component';
import { getAgreementSignerLabels } from '../../utils/agreement-signer-label.util';

/**
 * Entry step: one row per individual agreement of the order, with its status chip. Selecting a row
 * hands the document step its agreement.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgreementStatusTagComponent, IgntIconComponent, IgntListItemComponent, TranslateModule],
  selector: 'app-agreement-list-step',
  standalone: true,
  styleUrl: './agreement-list-step.component.scss',
  templateUrl: './agreement-list-step.component.html',
})
export class AgreementListStepComponent {
  readonly #translateService = inject(TranslateService);
  protected readonly store = inject(AgreementSigningStore);
  protected readonly signerRole = SignerRole;
  protected readonly signerLabels: Signal<Record<string, string | null>> = computed(() =>
    getAgreementSignerLabels(this.store.entities(), this.store.signers(), this.#translateService),
  );

  protected openDocument(individualAgreementId: string): void {
    this.store.selectAgreement(individualAgreementId);
    this.store.transition('openDocument');
  }

  /**
   * The row cannot be a native button (`fz-template/no-native-button`), so it carries the button
   * keyboard contract itself: Enter and Space open it, and Space must not scroll the modal.
   */
  protected activateRow(event: Event, individualAgreementId: string): void {
    event.preventDefault();
    this.openDocument(individualAgreementId);
  }
}
