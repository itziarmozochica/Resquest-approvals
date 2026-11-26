import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, input, OnInit, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ValidatorFn, Validators } from '@angular/forms';

import { ContactPhoneFieldComponent } from '@fz-original/app/shared/components/contact-phone-field/contact-phone-field.component';
import {
  phoneFormatValidator,
  phoneRequiredValidator,
  requireEmailOrPhone,
} from '@fz-original/app/shared/components/contact-phone-field/contact-phone-field.validators';
import { IngtFormError } from '@ignite/legacy/models/ignt-input.model';
import { TranslateService } from '@ngx-translate/core';
import { fromEvent } from 'rxjs';

import {
  ContactInformationOrderableFieldEnum,
  ContactInformationRequirementEnum,
  ContactInformationSetup,
} from './../../../../box-office/shared/models/onsite-setup';
import { NEW_ONSITE_SETUP_CONTACT_INFORMATION_FIELDS_ORDER } from './../../../../box-office/shared/utils/contact-information-fields-order.util';
import { toOnsiteContactInformationSetupValue } from './../../../../box-office/shared/utils/contact-information-setup.util';

export interface KioskContactFormValue {
  email: string;
  lastName: string;
  name: string;
  phoneNumber: string;
}

const LEGACY_FIELDS_ORDER: readonly ContactInformationOrderableFieldEnum[] = [
  ContactInformationOrderableFieldEnum.EMAIL,
  ContactInformationOrderableFieldEnum.FIRST_NAME,
  ContactInformationOrderableFieldEnum.LAST_NAME,
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-kiosk-contact',
  standalone: false,
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
})
export class ContactComponent implements OnInit {
  /** Rejects whitespace-only values: `Validators.pattern` applies a RegExp unanchored, so a single non-space character anywhere satisfies it. */
  static readonly nonBlankPattern = /\S/;
  @Input() contactInformationSetup: ContactInformationSetup | null = null;
  readonly defaultCountry = input<string | null>(null);
  @Input() hasFutureSessions = false;
  readonly isPhoneEnabled = input(false);
  @Input() requireFullName = false;
  readonly formSubmit = output<KioskContactFormValue>();
  readonly phoneError = signal<IngtFormError | null>(null);
  readonly phoneField = viewChild(ContactPhoneFieldComponent);

  readonly ContactInformationOrderableFieldEnum = ContactInformationOrderableFieldEnum;
  contactInformationForm: FormGroup = new FormGroup({});
  orderedFields: readonly ContactInformationOrderableFieldEnum[] = LEGACY_FIELDS_ORDER;
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly #translateService = inject(TranslateService);
  #focusedField: HTMLElement | null = null;
  #mandatoryFields = new Set<ContactInformationOrderableFieldEnum>();

  constructor() {
    const viewport: VisualViewport | undefined = globalThis.visualViewport ?? undefined;
    if (viewport !== undefined) {
      fromEvent(viewport, 'resize')
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe(() => this.#revealFocusedField());
    }
  }

  isControlInvalid(controlName: string): boolean {
    const control = this.contactInformationForm.get(controlName);
    return !!(control?.invalid && control?.touched);
  }

  isFormValid(): boolean {
    return this.contactInformationForm.valid;
  }

  isLastField(field: ContactInformationOrderableFieldEnum): boolean {
    return this.orderedFields[this.orderedFields.length - 1] === field;
  }

  ngOnInit(): void {
    const setup = toOnsiteContactInformationSetupValue(this.contactInformationSetup, NEW_ONSITE_SETUP_CONTACT_INFORMATION_FIELDS_ORDER);
    this.orderedFields = this.isPhoneEnabled() ? setup.fieldsOrder : LEGACY_FIELDS_ORDER;

    const isRequired =
      this.hasFutureSessions || this.contactInformationSetup?.requirement_on_current_day === ContactInformationRequirementEnum.REQUIRED;
    const showEmail = this.orderedFields.includes(ContactInformationOrderableFieldEnum.EMAIL);
    const showPhone = this.orderedFields.includes(ContactInformationOrderableFieldEnum.PHONE);
    const fullNameValidators = this.requireFullName ? [Validators.required, Validators.pattern(ContactComponent.nonBlankPattern)] : [];
    const emailValidators: ValidatorFn[] = [Validators.email];

    this.#mandatoryFields = new Set([
      ...(this.requireFullName ? [ContactInformationOrderableFieldEnum.FIRST_NAME, ContactInformationOrderableFieldEnum.LAST_NAME] : []),
      ...(isRequired && showEmail ? [ContactInformationOrderableFieldEnum.EMAIL] : []),
      ...(isRequired && showPhone ? [ContactInformationOrderableFieldEnum.PHONE] : []),
    ]);

    this.contactInformationForm = this.#fb.group({
      email: ['', isRequired && showEmail ? [Validators.required, ...emailValidators] : emailValidators],
      lastName: ['', fullNameValidators],
      name: ['', fullNameValidators],
      phoneNumber: this.#fb.control('', {
        updateOn: 'blur',
        validators: isRequired && showPhone ? [phoneRequiredValidator(), phoneFormatValidator()] : [phoneFormatValidator()],
      }),
    });

    this.contactInformationForm.controls['phoneNumber'].events
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.phoneError.set(this.#getPhoneError()));

    if (isRequired && showEmail && showPhone) {
      const emailControl = this.contactInformationForm.controls['email'];
      requireEmailOrPhone(emailControl, this.contactInformationForm.controls['phoneNumber'], emailValidators, this.#destroyRef);
      emailControl.updateValueAndValidity();
    }
  }

  onContactFieldBlur(): void {
    this.#focusedField = null;
  }

  onContactFieldFocus(event: FocusEvent): void {
    this.#focusedField = event.target as HTMLElement;
    this.#revealFocusedField();
  }

  /** IME Next/Done: advance focus on tablets/WebViews, or blur on the last field to hide the keyboard. */
  onContactFieldEnter(event: Event, field: ContactInformationOrderableFieldEnum): void {
    event.preventDefault();
    const nextField = this.orderedFields[this.orderedFields.indexOf(field) + 1];
    if (nextField === undefined) {
      (event.target as HTMLInputElement).blur();
    } else if (nextField === ContactInformationOrderableFieldEnum.PHONE) {
      this.phoneField()?.focusNumberInput();
    } else {
      const form = (event.target as HTMLElement).closest('form');
      form?.querySelector<HTMLInputElement>(`[data-contact-field="${nextField}"]`)?.focus();
    }
  }

  onPhoneFieldBlur(event: FocusEvent): void {
    const phoneFieldElement = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && phoneFieldElement.contains(event.relatedTarget)) {
      return;
    }
    this.onContactFieldBlur();
    this.#revealPhoneError();
  }

  onSubmit(): void {
    if (this.contactInformationForm.valid) {
      this.formSubmit.emit(this.contactInformationForm.getRawValue());
    } else {
      this.contactInformationForm.markAllAsTouched();
      this.#revealPhoneError();
      return;
    }
  }

  protected isFieldMandatory(field: ContactInformationOrderableFieldEnum): boolean {
    return this.#mandatoryFields.has(field);
  }

  #getPhoneError(): IngtFormError | null {
    if (!this.isControlInvalid('phoneNumber')) {
      return null;
    }
    if (this.contactInformationForm.get('phoneNumber')?.hasError('tel')) {
      return { message: this.#translateService.instant('boxOffice.contactInformationModal.validations.phoneFormat'), type: 'tel' };
    }
    return { message: this.#translateService.instant('form.error.required'), type: 'required' };
  }

  #revealFocusedField(): void {
    const prefersReducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.#focusedField?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
  }

  #revealPhoneError(): void {
    const phoneControl = this.contactInformationForm.controls['phoneNumber'];
    phoneControl.markAsTouched();
    phoneControl.updateValueAndValidity();
  }
}
