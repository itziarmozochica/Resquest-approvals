import { ChangeDetectionStrategy, Component, computed, effect, inject, Signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { TelTypeValue } from '@fz-original/app/shared/booking-questions/models';
import {
  countryValidator,
  telFormatValidator,
} from '@fz-original/app/shared/booking-questions/modules/form-group/tel-type/tel-type.validator';
import { ContactPhoneComponent } from '@fz-original/app/shared/components/contact-phone/contact-phone.component';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { IgntButtonComponent, IgntOptionTileComponent } from '@ignite/common';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IngtFormError } from '@ignite/legacy/models/ignt-input.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { SignerRole } from '../../../../requirements/enums/signer-role.enum';
import { IndividualAgreementStatus } from '../../../enums/individual-agreement-status.enum';
import { SignContextAgreement } from '../../../models/agreement-sign-context.model';
import { CoveredParticipant } from '../../../models/covered-participant.model';
import { IndividualAgreementToSign } from '../../../models/sign-agreements.model';
import { AgreementSigningStore } from '../../../services/agreement-signing.store';
import { nonBlankName, participantNameMaxLength } from '../../../utils/participant-name.util';
import { toE164PhoneNumber } from '../../../utils/signer-phone.util';
import { isGuardianSignature } from '../../../utils/signer-role.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ContactPhoneComponent,
    IgntButtonComponent,
    IgntCheckboxComponent,
    IgntInputFieldComponent,
    IgntOptionTileComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-signer-info-step',
  styleUrl: './signer-info-step.component.scss',
  templateUrl: './signer-info-step.component.html',
})
export class SignerInfoStepComponent {
  readonly #formBuilder = inject(FormBuilder);
  readonly #partnerService = inject(PartnerService);
  readonly #translate = inject(TranslateService);
  protected readonly store = inject(AgreementSigningStore);
  protected readonly signerRole = SignerRole;

  protected readonly defaultCountry: string = this.#partnerService.getPartner()?.countryCode ?? '';
  protected readonly maxNameLength = participantNameMaxLength;

  protected readonly signerForm = this.#formBuilder.group({
    email: this.#formBuilder.control('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    firstName: this.#formBuilder.control('', { nonNullable: true, validators: [nonBlankName] }),
    hasAcceptedAgreement: this.#formBuilder.control(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
    hasConfirmedDeclaration: this.#formBuilder.control(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
    lastName: this.#formBuilder.control('', { nonNullable: true, validators: [nonBlankName] }),
    minorName: this.#formBuilder.group({
      firstName: this.#formBuilder.control('', { nonNullable: true, validators: [nonBlankName] }),
      lastName: this.#formBuilder.control('', { nonNullable: true, validators: [nonBlankName] }),
    }),
    phoneNumber: this.#formBuilder.control<TelTypeValue | null>(
      this.defaultCountry === '' ? null : { country: this.defaultCountry.toUpperCase(), phone: '', prefix: '' },
      { validators: [countryValidator(), telFormatValidator()] },
    ),
  });

  protected readonly agreement: Signal<SignContextAgreement | null> = computed(() => this.store.signContext()?.agreements[0] ?? null);
  protected readonly isAgeBased: Signal<boolean> = computed(() => this.agreement()?.signerRole === SignerRole.AgeBased);
  protected readonly isAwaitingAnswer: Signal<boolean> = computed(() => this.isAgeBased() && this.store.answeredSignerRole() === null);
  protected readonly isGuardianSigned: Signal<boolean> = computed(() => {
    const agreement = this.agreement();
    return agreement !== null && isGuardianSignature(agreement.signerRole, this.store.answeredSignerRole());
  });
  protected readonly isSigning: Signal<boolean> = computed(() => this.store.isSigning());
  protected readonly coveredParticipant: Signal<CoveredParticipant | null> = computed(() => {
    const row = this.store.selectedAgreement();
    if (row === null || row.status === IndividualAgreementStatus.signed) {
      return null;
    }
    return { id: row.id, label: row.participant?.label ?? '' };
  });

  constructor() {
    // A failure belongs to the attempt that caused it: entering the form again starts clean.
    this.store.clearSignError();
    effect(() => {
      const { hasAcceptedAgreement, hasConfirmedDeclaration, minorName } = this.signerForm.controls;
      if (this.isGuardianSigned()) {
        minorName.enable({ emitEvent: false });
      } else {
        minorName.disable({ emitEvent: false });
      }
      // Each consent box reads differently on the adult and guardian forms, so a tick never carries over to the other.
      hasAcceptedAgreement.reset(false, { emitEvent: false });
      hasConfirmedDeclaration.reset(false, { emitEvent: false });
    });
  }

  protected acceptAndSign(): void {
    const agreement = this.agreement();
    const coveredParticipant = this.coveredParticipant();
    if (this.signerForm.invalid || this.isSigning() || this.isAwaitingAnswer() || agreement === null || coveredParticipant === null) {
      this.signerForm.markAllAsTouched();
      return;
    }
    this.store.sign({
      agreementVersionId: agreement.agreementVersionId,
      guardianDeclarationAccepted: this.isGuardianSigned() && this.signerForm.controls.hasConfirmedDeclaration.value,
      individualAgreements: [this.#individualAgreementToSign(coveredParticipant)],
      signer: {
        email: this.signerForm.controls.email.value,
        firstName: this.signerForm.controls.firstName.value.trim(),
        lastName: this.signerForm.controls.lastName.value.trim(),
        phoneNumber: toE164PhoneNumber(this.signerForm.controls.phoneNumber.value),
      },
    });
  }

  protected cancel(): void {
    // Ignite disables through aria-disabled, so the host still takes the click.
    if (this.isSigning()) {
      return;
    }
    this.store.goBack();
  }

  protected get phoneError(): IngtFormError | null {
    const control = this.signerForm.controls.phoneNumber;
    if (!control.touched || control.valid) {
      return null;
    }
    return {
      message: this.#translate.instant('agreements.signing.modal.signer.phoneError'),
      type: control.hasError('country') ? 'country' : 'tel',
    };
  }

  protected showCheckboxError(control: FormControl<boolean>): boolean {
    return control.touched && control.invalid;
  }

  protected toggleControl(control: FormControl<boolean>, isChecked: boolean): void {
    control.setValue(isChecked);
    control.markAsTouched();
  }

  #individualAgreementToSign(coveredParticipant: CoveredParticipant): IndividualAgreementToSign {
    if (this.isGuardianSigned() === false) {
      return { id: coveredParticipant.id };
    }
    const { firstName, lastName } = this.signerForm.controls.minorName.controls;
    return { firstName: firstName.value.trim(), id: coveredParticipant.id, lastName: lastName.value.trim() };
  }
}
