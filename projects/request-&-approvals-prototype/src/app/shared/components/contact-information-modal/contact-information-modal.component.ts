import { NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  IGNT_DIALOG_DATA,
  IGNT_DIALOG_REF,
  IgntButtonComponent,
  IgntDialogModule,
  IgntDialogRef,
  IgntMenuItemCustomTemplateDirective,
  MENU,
} from '@ignite/common';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IngtFormError } from '@ignite/legacy/models/ignt-input.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, EMPTY, map, Observable, of, take } from 'rxjs';

import {
  CONTACT_INFO_SYNC_NAME_MAX_LENGTH,
  contactInfoSyncValidatorsForField,
} from '../../../modules/box-office/shared/helpers/contact-info-field-validators';
import {
  CONTACT_INFO_DUAL_SCREEN_IS_HOST,
  type ContactInfoFormValue,
  type FieldName,
} from '../../../modules/box-office/shared/models/dual-screen-sync/contact-info-dual-screen-sync.model';
import { ContactInformationOrderableFieldEnum } from '../../../modules/box-office/shared/models/onsite-setup';
import { ContactInfoDualScreenSyncService } from '../../../modules/box-office/shared/services/dual-screen-sync/contact-info-dual-screen-sync.service';
import { MainScreenContactInfoSyncService } from '../../../modules/box-office/shared/services/dual-screen-sync/main-screen-contact-info-sync.service';
import { resolveContactInformationFieldsOrder } from '../../../modules/box-office/shared/utils/contact-information-fields-order.util';
import { InputMobileBehaviorModule } from '../../directives/input-mobile-behavior/input-mobile-behavior.module';
import { CustomerType } from '../../models/customer/customer-type.enum';
import { Customer } from '../../models/customer/customer.model';
import { Terms } from '../../models/customer/terms.enum';
import { ContactInformationDraftService } from '../../services/contact-information-draft/contact-information-draft.service';
import { ContactInformationHistory } from '../../services/contact-information-history/contact-information-history.model';
import { ContactInformationHistoryService } from '../../services/contact-information-history/contact-information-history.service';
import { OboPrivacyDisclaimerService } from '../../services/obo-privacy-disclaimer/obo-privacy-disclaimer.service';
import { ContactPhoneFieldComponent } from '../contact-phone-field/contact-phone-field.component';
import { toInternationalPhoneNumber } from '../contact-phone-field/contact-phone-field.util';
import { phoneFormatValidator, phoneRequiredValidator, requireEmailOrPhone } from '../contact-phone-field/contact-phone-field.validators';
import { LoadingNoticeComponent } from '../loading-notice/loading-notice.component';

export type ContactInformationUserDetails =
  | { email?: string; firstName?: string; lastName?: string; phoneNumber?: string }
  | null
  | undefined;

export interface ContactInformationModalData {
  defaultCountry: string | null;
  isDualScreenSynchronizationActive: boolean;
  mandatoryFields: string[];
  previousUserDetails: ContactInformationUserDetails;
  showEmail: boolean;
  showPhoneNumber: boolean;
  /**
   * Emits once the server cart the details are collected for exists. Until then Checkout and Enter do nothing and
   * the cart pending indicator shows. Absent means the cart is ready already.
   */
  cartReady$?: Observable<unknown>;
  fieldsOrder?: ContactInformationOrderableFieldEnum[] | null;
  /** Writes the details to `ContactInformationDraftService` as they are typed. */
  keepsDraft?: boolean;
}

export type ContactInformationModalResult = Customer | null | undefined;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '(keydown)': 'onKeyDown($event)',
  },
  imports: [
    ContactPhoneFieldComponent,
    IgntButtonComponent,
    IgntCheckboxComponent,
    IgntDialogModule,
    IgntIconButtonComponent,
    IgntInputFieldComponent,
    IgntMenuItemCustomTemplateDirective,
    InputMobileBehaviorModule,
    LoadingNoticeComponent,
    ...MENU,
    NgTemplateOutlet,
    ReactiveFormsModule,
    TranslateModule,
  ],
  providers: [
    { provide: CONTACT_INFO_DUAL_SCREEN_IS_HOST, useValue: true },
    ContactInfoDualScreenSyncService,
    MainScreenContactInfoSyncService,
  ],
  selector: 'app-contact-information-modal',
  standalone: true,
  styleUrl: './contact-information-modal.component.scss',
  templateUrl: './contact-information-modal.component.html',
})
export class ContactInformationModalComponent implements AfterViewInit, OnDestroy, OnInit {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<ContactInformationModalResult>;
  readonly #draftService = inject(ContactInformationDraftService);
  readonly #historyService = inject(ContactInformationHistoryService);
  readonly #mainScreenSync = inject(MainScreenContactInfoSyncService);
  readonly #oboPrivacyDisclaimer = inject(OboPrivacyDisclaimerService);
  readonly #formBuilder = inject(FormBuilder);
  readonly #igntDialogData = inject<Partial<ContactInformationModalData> | null | undefined>(IGNT_DIALOG_DATA, { optional: true });
  readonly #translate = inject(TranslateService);
  readonly dialogData = signal<Partial<ContactInformationModalData> | null | undefined>(this.#igntDialogData);
  readonly resolvedDialogData = computed<ContactInformationModalData>(() => ({
    defaultCountry: null,
    fieldsOrder: null,
    isDualScreenSynchronizationActive: false,
    mandatoryFields: [],
    previousUserDetails: null,
    showEmail: true,
    showPhoneNumber: false,
    ...(this.dialogData() ?? {}),
  }));
  readonly defaultCountry = computed(() => this.resolvedDialogData().defaultCountry);
  readonly fieldsOrder = computed(() => this.resolvedDialogData().fieldsOrder);
  readonly mandatoryFields = computed(() => this.resolvedDialogData().mandatoryFields);
  readonly previousUserDetails = computed(() => this.resolvedDialogData().previousUserDetails);
  readonly showEmail = computed(() => this.resolvedDialogData().showEmail);
  readonly showPhoneNumber = computed(() => this.resolvedDialogData().showPhoneNumber);
  /** A failed cart never readies the modal: the opener closes it instead. */
  readonly cartReady = toSignal(
    this.#igntDialogData?.cartReady$?.pipe(
      take(1),
      map((): boolean => true),
      catchError(() => EMPTY),
    ) ?? of(true),
    { initialValue: this.#igntDialogData?.cartReady$ == null },
  );

  readonly orderedVisibleFields = computed<ContactInformationOrderableFieldEnum[]>(() =>
    resolveContactInformationFieldsOrder(this.fieldsOrder(), this.showEmail(), this.showPhoneNumber()),
  );

  readonly ContactInformationOrderableFieldEnum = ContactInformationOrderableFieldEnum;

  readonly showPrivacyDisclaimer = signal(this.#oboPrivacyDisclaimer.shouldShowPrivacyDisclaimer());
  readonly #isPrivacyDisclaimerExpanded = signal(false);
  readonly isPrivacyDisclaimerExpanded = this.#isPrivacyDisclaimerExpanded.asReadonly();
  readonly privacyDisclaimerToggleLabel = computed(() => (this.#isPrivacyDisclaimerExpanded() ? 'common.seeLess' : 'common.seeMore'));

  readonly firstNameInput = viewChild<IgntInputFieldComponent>('firstNameInput');
  readonly lastNameInput = viewChild<IgntInputFieldComponent>('lastNameInput');
  readonly emailInput = viewChild<IgntInputFieldComponent>('emailInput');
  readonly phoneComponent = viewChild(ContactPhoneFieldComponent);

  readonly #isPreviousContactDetailsSynced = signal(false);

  readonly isDualScreenSynchronizationActive = computed(() => this.resolvedDialogData().isDualScreenSynchronizationActive);

  readonly NAME_FIELD_MAX_LENGTH = CONTACT_INFO_SYNC_NAME_MAX_LENGTH;
  readonly contactInfoActiveEditField = computed(() => this.#mainScreenSync.activeEditField());
  contactHistory: ContactInformationHistory[] = [];
  showInitialErrors = false;

  contactInformationForm: FormGroup = new FormGroup({});

  constructor() {
    effect(() => {
      const sharedFormState = this.#mainScreenSync.contactInfoFormState();
      const previousContactDetailsSynced = this.#isPreviousContactDetailsSynced();
      const dualSyncActive = this.isDualScreenSynchronizationActive();
      untracked(() => {
        if (!dualSyncActive || !previousContactDetailsSynced) {
          return;
        }
        this.#syncContactInformation(sharedFormState);
      });
    });

    effect(() => {
      const activeEditField = this.contactInfoActiveEditField();
      untracked(() => {
        if (!this.isDualScreenSynchronizationActive()) {
          return;
        }
        if (activeEditField === null) {
          this.contactInformationForm.enable();
          this.contactInformationForm.markAsTouched();
        }
      });
    });
  }

  accept(): void {
    const formObject = this.contactInformationForm.getRawValue();
    if (this.contactInformationForm.valid) {
      const { phoneNumber, termsAndConditions } = formObject;

      const customer: Customer = {
        acceptedTerms: this.#getAcceptedTerms(termsAndConditions ?? true),
        cityStandardId: undefined,
        email: (formObject['email'] ?? '') as string,
        firstName: formObject['firstName'] ? formObject['firstName'] : 'Generic user',
        id: undefined,
        lastName: formObject['lastName'] ?? '',
        phoneNumber: phoneNumber ?? '',
        type: CustomerType.USER,
      };

      this.#historyService.saveContactInformation(
        formObject['firstName'] ?? '',
        formObject['lastName'] ?? '',
        formObject['email'] ?? '',
        phoneNumber ?? '',
      );

      this.#dialogRef.close(customer);
    } else {
      this.#dialogRef.close(null);
    }
  }

  applyHistoryItem(item: ContactInformationHistory): void {
    this.contactInformationForm.patchValue({
      email: item.email,
      firstName: item.firstName,
      lastName: item.lastName,
      phoneNumber: item.phoneNumber ?? '',
    });
  }

  get canSubmitContactInformationForm(): boolean {
    if (!this.cartReady() || !this.contactInformationForm || !this.contactInformationForm.valid) {
      return false;
    }
    return !this.#hasMandatoryFields() || this.#hasEmail() || this.#hasPhoneNumber();
  }

  formatHistoryDateTime(dateTime: string): string {
    const date = new Date(dateTime);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  getControlClass(control: AbstractControl | null, showValidStatus?: boolean): string {
    if (control === null) {
      return '';
    }

    const shouldShowError = this.showInitialErrors || control.touched;

    if (!control.valid && shouldShowError) {
      return 'form-input--invalid';
    }
    if (control.value !== '') {
      return control.hasValidator(Validators.required) || showValidStatus ? 'form-input--valid' : '';
    }
    return '';
  }

  getControlError(control: AbstractControl | null): string {
    if (control === null) {
      return '';
    }
    const priority = ['required', 'emailValidator', 'maxlength'];
    const errors = Object.getOwnPropertyNames(control.errors || {}).sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
    return errors.length > 0 ? (errors.shift() ?? '') : '';
  }

  getPhoneControlError(control: AbstractControl | null): IngtFormError | null {
    if (!control || !control.errors) {
      return null;
    }

    const phoneErrors = [
      { message: this.#translate.instant('boxOffice.contactInformationModal.validations.phoneFormat'), type: 'required' },
      { message: this.#translate.instant('boxOffice.contactInformationModal.validations.phoneFormat'), type: 'tel' },
    ];

    return phoneErrors.find(phoneError => control.hasError(phoneError.type)) ?? null;
  }

  ngAfterViewInit(): void {
    if (this.mandatoryFields().length > 0) {
      this.#updateRequiredValidator();
      this.#setupConditionalValidation();
    }
    this.#focusFirstInput();

    if (this.isDualScreenSynchronizationActive()) {
      this.#mainScreenSync.setupDualScreenFormBroadcast(
        this.contactInformationForm,
        this.showEmail(),
        this.showPhoneNumber(),
        this.#oboPrivacyDisclaimer.shouldShowPrivacyDisclaimer(),
        this.fieldsOrder(),
      );
      this.#isPreviousContactDetailsSynced.set(true);
    }
  }

  ngOnDestroy(): void {
    if (this.isDualScreenSynchronizationActive()) {
      this.#mainScreenSync.resetDualScreenFormBroadcast();
    }
  }

  ngOnInit(): void {
    this.contactInformationForm = this.#formBuilder.group({
      email: [this.previousUserDetails()?.email || '', contactInfoSyncValidatorsForField('email')],
      firstName: [this.previousUserDetails()?.firstName || '', contactInfoSyncValidatorsForField('firstName')],
      lastName: [this.previousUserDetails()?.lastName || '', contactInfoSyncValidatorsForField('lastName')],
      phoneNumber: [this.previousUserDetails()?.phoneNumber || '', [phoneFormatValidator()]],
      termsAndConditions: [true],
    });

    this.contactHistory = this.#historyService.getHistory();

    if (this.resolvedDialogData().keepsDraft) {
      this.#keepDraft();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.canSubmitContactInformationForm) {
        this.accept();
      }
    }
  }

  get showGoToCheckoutLabelButton(): boolean {
    if (!this.contactInformationForm) {
      return false;
    }
    return this.#hasMandatoryFields() || this.#hasEmail() || this.#hasPhoneNumber();
  }

  toggleEditControl(field: FieldName): void {
    const activeField = this.contactInfoActiveEditField();
    if (activeField === null) {
      this.#openSyncedEditControl(field);
      return;
    }
    if (activeField === field) {
      this.#mainScreenSync.pushCloseEditControl();
      return;
    }
    this.#mainScreenSync.pushCloseEditControl();
    this.contactInformationForm.enable({ emitEvent: false });
    this.#openSyncedEditControl(field);
  }

  togglePrivacyDisclaimer(): void {
    this.#isPrivacyDisclaimerExpanded.update(isExpanded => !isExpanded);
  }

  #focusFirstInput(): void {
    setTimeout(() => {
      const firstField = this.orderedVisibleFields()[0];
      switch (firstField) {
        case ContactInformationOrderableFieldEnum.LAST_NAME:
          this.lastNameInput()?.inputElement?.nativeElement?.focus();
          break;
        case ContactInformationOrderableFieldEnum.EMAIL:
          this.emailInput()?.inputElement?.nativeElement?.focus();
          break;
        case ContactInformationOrderableFieldEnum.PHONE:
          this.phoneComponent()?.focusNumberInput();
          break;
        default:
          this.firstNameInput()?.inputElement?.nativeElement?.focus();
      }
    });
  }

  #getAcceptedTerms(termsAndConditions: boolean): string[] {
    let acceptedTerms: string[] = [];
    if (termsAndConditions) {
      acceptedTerms = [Terms.ON_SITE_TERMS_OF_PRIVACY];
    }
    return acceptedTerms;
  }

  #hasEmail(): boolean {
    return (this.contactInformationForm.getRawValue().email ?? '') !== '';
  }

  #hasMandatoryFields(): boolean {
    return this.mandatoryFields().length > 0;
  }

  #hasPhoneNumber(): boolean {
    return (this.contactInformationForm.getRawValue().phoneNumber ?? '') !== '';
  }

  #keepDraft(): void {
    this.contactInformationForm.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.#saveDraft());
  }

  #mergeSyncedPhoneNumber(syncedPhone: string): string {
    const current: string = this.contactInformationForm.get('phoneNumber')?.value ?? '';
    return toInternationalPhoneNumber(syncedPhone, current, this.defaultCountry());
  }

  #openSyncedEditControl(field: FieldName): void {
    this.#mainScreenSync.pushOpenEditControl(field);
    const control = this.contactInformationForm.get(field);
    control?.disable({ emitEvent: false });
  }

  #saveDraft(): void {
    const { email, firstName, lastName, phoneNumber } = this.contactInformationForm.getRawValue();
    this.#draftService.save({
      email: email ?? '',
      firstName: firstName ?? '',
      lastName: lastName ?? '',
      phoneNumber: phoneNumber ?? '',
    });
  }

  #setupConditionalValidation(): void {
    const emailControl = this.contactInformationForm.get('email');
    const phoneControl = this.contactInformationForm.get('phoneNumber');
    if (emailControl && phoneControl) {
      requireEmailOrPhone(emailControl, phoneControl, contactInfoSyncValidatorsForField('email'), this.#destroyRef);
    }
  }

  #syncContactInformation(sharedFormState: ContactInfoFormValue): void {
    this.contactInformationForm.patchValue(
      {
        email: sharedFormState.email ?? '',
        firstName: sharedFormState.firstName ?? '',
        lastName: sharedFormState.lastName ?? '',
        phoneNumber: this.#mergeSyncedPhoneNumber(sharedFormState.phoneNumber ?? ''),
      },
      { emitEvent: false },
    );
    // The second screen's patch emits no value change, so the draft is written here.
    if (this.resolvedDialogData().keepsDraft) {
      this.#saveDraft();
    }
  }

  #updateRequiredValidator(): void {
    if (!this.contactInformationForm) {
      return;
    }

    for (const field in this.contactInformationForm.controls) {
      const control: AbstractControl | null = this.contactInformationForm.get(field);
      if (control === null) {
        continue;
      }

      if (this.mandatoryFields().includes(field)) {
        control.valueChanges.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
          if (field === 'phoneNumber') {
            control.addValidators([phoneRequiredValidator()]);
          } else {
            control.addValidators([Validators.required]);
          }
          control.updateValueAndValidity({ emitEvent: false });
        });
      }
    }
  }
}
