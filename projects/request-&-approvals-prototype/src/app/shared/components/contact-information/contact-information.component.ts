import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, input, OnInit, Output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { IconsModule } from '../../icons/icons.module';
import { CustomerType } from '../../models/customer/customer-type.enum';
import { Customer } from '../../models/customer/customer.model';
import { Terms } from '../../models/customer/terms.enum';
import { OboPrivacyDisclaimerService } from '../../services/obo-privacy-disclaimer/obo-privacy-disclaimer.service';
import { emailValidator } from '../../validators/email.validator';

export interface ContactInformation {
  email: string;
  firstName: string;
  includeDeliveryNoteAttachment: boolean;
  lastName: string;
  termsAndConditions: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, ReactiveFormsModule, IconsModule, IgntInputFieldComponent],
  selector: 'app-contact-information',
  standalone: true,
  styleUrls: ['./contact-information.component.scss'],
  templateUrl: './contact-information.component.html',
})
export class ContactInformationComponent implements OnInit {
  constructor(private formBuilder: FormBuilder) {}

  contactInformationForm = this.formBuilder.group({
    email: ['', [emailValidator()]],
    firstName: [''],
    includeDeliveryNoteAttachment: [false],
    lastName: [''],
    termsAndConditions: [true],
  });

  @Input() allowEmptyEmail = false;
  /**
   * When `true`, an empty first name is kept empty instead of being substituted with the `Generic user`
   * placeholder. The guest conversion flow sets it so the lead's real (possibly partial) name travels
   * untouched, per GAME-1200.
   */
  @Input() allowEmptyName = false;
  @Output() includeDeliveryNoteAttachmentEvent = new EventEmitter<boolean>();
  @Input() mandatoryFields: string[] = [];
  /**
   * Lets a host suppress the on-behalf privacy disclaimer even when the service would show it. The
   * quote flow sets it to `false`: no reservation is made on the guest's behalf, so there is no
   * consent to collect — and while suppressed, `getCustomerFromForm()` also reports NO accepted
   * terms, so a disclaimer nobody saw is never recorded as granted.
   */
  readonly isPrivacyDisclaimerAllowed = input(true);
  readonly titleKey = input('boxOffice.contactInformation');
  readonly NAME_FIELD_MAX_LENGTH = 70;
  @Input() showDeliveryNoteCheck?: boolean = false;
  @Input() emailHelperTextKey = 'boxOffice.emailExplanation';

  @Output() updateCustomer = new EventEmitter<Customer | null>();

  readonly #oboPrivacyDisclaimer = inject(OboPrivacyDisclaimerService);
  readonly showPrivacyDisclaimer = signal(this.#oboPrivacyDisclaimer.shouldShowPrivacyDisclaimer());

  @Input() set contactInformation(value: Partial<ContactInformation>) {
    if (!value) {
      return;
    }
    this.contactInformationForm.patchValue(value, { emitEvent: true });
    this.updateContactInformation();
  }

  getCustomerFromForm(): Customer | null {
    const formObject = this.contactInformationForm.value;
    const emailControl = this.contactInformationForm.get('email');
    const emailValue = emailControl?.value ?? '';
    const isEmailMissing = emailValue === '' && !this.allowEmptyEmail;
    if (!this.contactInformationForm.valid || isEmailMissing) {
      return null;
    }
    return {
      acceptedTerms: this.getAcceptedTerms(this.isPrivacyDisclaimerAllowed() && (formObject['termsAndConditions'] ?? true)),
      cityStandardId: undefined,
      email: emailValue,
      firstName: formObject['firstName'] ? formObject['firstName'] : this.#emptyFirstName(),
      id: undefined,
      lastName: formObject['lastName'] ?? '',
      type: CustomerType.USER,
    };
  }

  ngOnInit(): void {
    this.updateRequiredValidator();
    this.onValueChanges();
  }

  onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLInputElement;
    if (target.id == 'lastName' && event.key == 'Enter') {
      target.blur();
    }
  }

  updateIncludeDeliveryNoteAttachment(event: Event) {
    const target = event.target as HTMLInputElement;
    this.includeDeliveryNoteAttachmentEvent.emit(target.checked);
  }

  validateForm(): boolean {
    this.contactInformationForm.markAllAsTouched();
    Object.values(this.contactInformationForm.controls).forEach(control => {
      control.updateValueAndValidity();
    });
    return this.contactInformationForm.valid;
  }

  #emptyFirstName(): string {
    return this.allowEmptyName ? '' : 'Generic user';
  }

  private getAcceptedTerms(termsAndConditions: boolean): string[] {
    let acceptedTerms: string[] = [];
    if (termsAndConditions) {
      acceptedTerms = [Terms.ON_SITE_TERMS_OF_PRIVACY];
    }
    return acceptedTerms;
  }

  private onValueChanges(): void {
    this.contactInformationForm.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe(() => this.updateContactInformation());
  }

  private updateContactInformation(): void {
    this.updateCustomer.emit(this.getCustomerFromForm());
  }

  private updateRequiredValidator(): void {
    if (!this.contactInformationForm) {
      return;
    }
    let control: AbstractControl | null;
    for (const field in this.contactInformationForm.controls) {
      control = this.contactInformationForm.get(field);
      if (control === null) {
        continue;
      }
      if (this.mandatoryFields.includes(field)) {
        control.addValidators([Validators.required]);
      } else {
        control.removeValidators([Validators.required]);
      }
      control.updateValueAndValidity();
    }
  }
}
