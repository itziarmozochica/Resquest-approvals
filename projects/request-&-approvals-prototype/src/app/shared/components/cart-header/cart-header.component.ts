import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CONTACT_INFO_SYNC_NAME_MAX_LENGTH } from '@fz-original/app/modules/box-office/shared/helpers/contact-info-field-validators';
import { ReservationStatus } from '@fz-original/app/modules/reservation/models/reservation-status.enum';
import { IgntAlertComponent } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';

import { InputMobileBehaviorModule } from '../../directives/input-mobile-behavior/input-mobile-behavior.module';
import { PermissionBaseModule } from '../../directives/permission-based/permission-base.module';
import { IconsModule } from '../../icons/icons.module';
import { PipesModule } from '../../pipes/pipes.module';
import { Permissions } from '../../services/user/permissions';
import { UserService } from '../../services/user/user.service';
import { isPlaceholderEmail } from '../../utils/placeholder-email.util';
import { emailValidator } from '../../validators/email.validator';
import { SharedComponentsModule } from '../shared-components.module';
import { CartHeaderContactEdit, CartHeaderContactUpdateResult } from './cart-header-contact.model';
import { formatCartHeaderContactName, hasCartHeaderContactChanges, normalizeCartHeaderContactEmail } from './cart-header-contact.util';

type EditContactStep = 'form' | 'review';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntButtonComponent,
    IgntCheckboxComponent,
    IgntInputFieldComponent,
    IgntTagComponent,
    IconsModule,
    InputMobileBehaviorModule,
    PermissionBaseModule,
    PipesModule,
    IgntAlertComponent,
    ReactiveFormsModule,
    SharedComponentsModule,
    TranslateModule,
    UpperCasePipe,
  ],
  selector: 'app-cart-header',
  standalone: true,
  styleUrls: ['./cart-header.component.scss'],
  templateUrl: './cart-header.component.html',
})
export class CartHeaderComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #formBuilder = inject(FormBuilder);
  readonly #userService = inject(UserService);

  #isCollapsedSignal = signal<boolean>(false);
  #pendingContactApply = signal(false);
  #editContactEmail = signal('');
  protected readonly showEditContactSlider = signal(false);
  protected readonly editContactStep = signal<EditContactStep>('form');
  protected readonly originalContact = signal<CartHeaderContactEdit | null>(null);
  protected readonly pendingContact = signal<CartHeaderContactEdit | null>(null);
  protected readonly nameFieldMaxLength = CONTACT_INFO_SYNC_NAME_MAX_LENGTH;

  protected readonly editContactForm = this.#formBuilder.nonNullable.group({
    email: ['', [Validators.required, emailValidator()]],
    firstName: ['', [Validators.maxLength(CONTACT_INFO_SYNC_NAME_MAX_LENGTH)]],
    lastName: ['', [Validators.maxLength(CONTACT_INFO_SYNC_NAME_MAX_LENGTH)]],
  });

  constructor() {
    this.editContactForm.controls.email.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(email => {
      this.#editContactEmail.set(email);
    });
  }

  readonly contactUpdateInProgress = input(false);
  readonly firstName = input('');
  readonly isGuest = input(false);
  readonly isMember = input(false);
  readonly isReservationDetail = input(false);
  readonly lastName = input('');
  readonly ownerEmail = input('');
  readonly ownerFullName = input('');
  readonly ownerNameEditable = input(false);
  readonly ownerPhone = input('');
  readonly planAddress = input('');
  readonly planName = input('');
  readonly reservationDetailsCompactMobile = input(false);
  readonly reservationStatus = input<ReservationStatus | undefined>(undefined);
  readonly sessionStartAt = input('');
  readonly showSessionDate = input(true);
  readonly timezone = input('');

  readonly contactEdited = output<CartHeaderContactEdit>();
  readonly isCollapsedEmitter = output<boolean>();

  readonly hasOwnerEmail = computed(() => Boolean(this.ownerEmail()?.trim()));
  readonly hasOwnerPhone = computed(() => Boolean(this.ownerPhone()?.trim()));
  readonly isCollapsed = this.#isCollapsedSignal.asReadonly();
  readonly canEditContact = computed(
    () =>
      this.isReservationDetail() &&
      this.reservationStatus() === ReservationStatus.TO_BE_PAID &&
      this.#userService.hasPermission(Permissions.CAN_MODIFY_RESERVATION) &&
      !this.isGuest() &&
      !this.isMember(),
  );

  protected readonly originalHasNoUsableEmail = computed(() => {
    const ownerEmail = this.ownerEmail();
    return !ownerEmail.trim() || isPlaceholderEmail(ownerEmail);
  });

  protected readonly areNameFieldsEditable = computed(() => {
    if (this.ownerNameEditable()) {
      return true;
    }

    if (this.originalHasNoUsableEmail()) {
      return true;
    }

    const original = this.originalContact();
    if (!original) {
      return false;
    }

    return normalizeCartHeaderContactEmail(this.#editContactEmail()) !== normalizeCartHeaderContactEmail(original.email);
  });

  protected readonly isApplyContactLoading = computed(() => this.contactUpdateInProgress() || this.#pendingContactApply());

  protected readonly reviewOriginalName = computed(() => {
    const original = this.originalContact();
    if (!original) {
      return '';
    }

    return formatCartHeaderContactName(original.firstName, original.lastName);
  });

  protected readonly reviewNewName = computed(() => {
    const pending = this.pendingContact();
    if (!pending) {
      return '';
    }

    return formatCartHeaderContactName(pending.firstName, pending.lastName);
  });

  protected readonly reviewHasNameChange = computed(() => {
    const original = this.originalContact();
    const pending = this.pendingContact();
    if (!original || !pending) {
      return false;
    }

    return (
      formatCartHeaderContactName(original.firstName, original.lastName) !==
      formatCartHeaderContactName(pending.firstName, pending.lastName)
    );
  });

  protected readonly reviewHasEmailChange = computed(() => {
    const original = this.originalContact();
    const pending = this.pendingContact();
    if (!original || !pending) {
      return false;
    }

    return normalizeCartHeaderContactEmail(original.email) !== normalizeCartHeaderContactEmail(pending.email);
  });

  protected readonly reviewShowProfileUpdateWarning = computed(
    () => this.reviewHasNameChange() && !this.reviewHasEmailChange() && !this.originalHasNoUsableEmail(),
  );

  protected readonly reviewPreviousEmailForDisplay = computed(() => this.originalContact()?.email?.trim() || '—');

  protected readonly reviewCurrentEmailForDisplay = computed(() => this.pendingContact()?.email?.trim() || '—');

  protected readonly reviewShowPaymentLinkResentWarning = computed(
    () => this.reviewHasEmailChange() && Boolean(this.originalContact()?.email?.trim()),
  );

  protected readonly reviewProfileEmail = computed(() => {
    const original = this.originalContact();
    return original?.email ?? this.ownerEmail();
  });

  protected readonly reviewNewEmail = computed(() => this.pendingContact()?.email ?? '');

  completeContactUpdate(outcome: CartHeaderContactUpdateResult): void {
    if (!this.isPendingContactApply()) {
      return;
    }

    this.#pendingContactApply.set(false);

    if (outcome === 'success') {
      this.#closeEditContactSlider();
    }
  }

  isPendingContactApply(): boolean {
    return this.#pendingContactApply();
  }

  toggleIsCollapsed(): void {
    this.#isCollapsedSignal.update(current => !current);
    this.isCollapsedEmitter.emit(this.#isCollapsedSignal());
  }

  protected onApplyContactChanges(): void {
    if (this.isApplyContactLoading()) {
      return;
    }

    const contact = this.pendingContact();
    if (!contact) {
      return;
    }

    this.#pendingContactApply.set(true);
    this.contactEdited.emit(this.#resolveContactForPersist(contact));
  }

  protected onBackToEditContact(): void {
    if (this.isApplyContactLoading()) {
      return;
    }

    this.editContactStep.set('form');
  }

  protected onCancelEditContact(): void {
    if (this.isApplyContactLoading()) {
      return;
    }

    this.#resetEditContactFormFromInputs();
    this.#closeEditContactSlider();
  }

  protected onConfirmEditContact(): void {
    if (this.isApplyContactLoading()) {
      return;
    }

    const { email, firstName, lastName } = this.editContactForm.controls;

    email.markAsTouched();
    if (!email.valid) {
      return;
    }

    if (this.areNameFieldsEditable()) {
      firstName.markAsTouched();
      lastName.markAsTouched();
      if (!firstName.valid || !lastName.valid) {
        return;
      }
    }

    const contact = this.editContactForm.getRawValue();
    const original = this.originalContact();
    if (!original || !hasCartHeaderContactChanges(original, contact)) {
      this.#closeEditContactSlider();
      return;
    }

    this.pendingContact.set(contact);
    this.editContactStep.set('review');
  }

  protected onEditContact(): void {
    if (!this.canEditContact()) {
      return;
    }

    this.originalContact.set(this.#getContactFromInputs());
    this.pendingContact.set(null);
    this.editContactStep.set('form');
    this.#resetEditContactFormFromInputs();
    this.#applyEmailRequiredValidator();
    this.showEditContactSlider.set(true);
  }

  #applyEmailRequiredValidator(): void {
    const emailControl = this.editContactForm.controls.email;
    emailControl.setValidators(this.originalHasNoUsableEmail() ? [emailValidator()] : [Validators.required, emailValidator()]);
    emailControl.updateValueAndValidity();
  }

  #closeEditContactSlider(): void {
    this.showEditContactSlider.set(false);
    this.editContactStep.set('form');
    this.originalContact.set(null);
    this.pendingContact.set(null);
    this.#pendingContactApply.set(false);
  }

  #getContactFromInputs(): CartHeaderContactEdit {
    let firstName = this.firstName();
    let lastName = this.lastName();
    if (!firstName && !lastName && this.ownerFullName()) {
      const nameParts = this.ownerFullName().trim().split(/\s+/);
      firstName = nameParts[0] ?? '';
      lastName = nameParts.slice(1).join(' ');
    }

    const ownerEmail = this.ownerEmail();

    return {
      email: isPlaceholderEmail(ownerEmail) ? '' : ownerEmail,
      firstName,
      lastName,
    };
  }

  #resetEditContactFormFromInputs(): void {
    const contact = this.pendingContact() ?? this.#getContactFromInputs();
    this.editContactForm.reset({
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
    });
    this.#editContactEmail.set(contact.email);
  }

  #resolveContactForPersist(contact: CartHeaderContactEdit): CartHeaderContactEdit {
    if (contact.email.trim()) {
      return contact;
    }

    const ownerEmail = this.ownerEmail();
    return isPlaceholderEmail(ownerEmail) ? { ...contact, email: ownerEmail } : contact;
  }
}
