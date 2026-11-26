import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

import { MultiStepModalShellComponent } from '@fz-original/app/shared/multi-step-modal/containers/multi-step-modal-shell/multi-step-modal-shell.component';
import {
  MULTI_STEP_MODAL_CONFIG,
  MULTI_STEP_MODAL_CONTROLLER,
} from '@fz-original/app/shared/multi-step-modal/tokens/multi-step-modal.token';

import { AgreementSigningStore } from '../../../services/agreement-signing.store';
import { agreementSigningModalConfig } from '../../config/agreement-signing-modal.config';
import { createAgreementSigningController } from '../../utils/agreement-signing-controller.util';

/**
 * Thin host that scopes the store to the dialog: providing `AgreementSigningStore` here means the
 * agreements are re-fetched per opening and discarded on close. The store reads `IGNT_DIALOG_DATA`
 * and initialises navigation in its own `onInit`, so there is nothing for this class to do.
 *
 * Unencapsulated styles: the reading column is set on the dialog shell, which is this component's
 * ancestor and therefore out of reach of an encapsulated stylesheet.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [MultiStepModalShellComponent],
  providers: [
    { provide: MULTI_STEP_MODAL_CONFIG, useValue: agreementSigningModalConfig },
    AgreementSigningStore,
    { deps: [AgreementSigningStore], provide: MULTI_STEP_MODAL_CONTROLLER, useFactory: createAgreementSigningController },
  ],
  selector: 'app-agreement-signing-modal-shell',
  standalone: true,
  styleUrl: './agreement-signing-modal-shell.component.scss',
  templateUrl: './agreement-signing-modal-shell.component.html',
})
export class AgreementSigningModalShellComponent {}
