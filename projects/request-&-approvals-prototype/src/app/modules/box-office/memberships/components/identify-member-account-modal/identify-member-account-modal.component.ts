import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import {
  IGNT_DIALOG_DATA,
  IGNT_DIALOG_REF,
  IgntButtonComponent,
  IgntDialogContentComponent,
  IgntDialogFooterComponent,
  IgntDialogHeaderComponent,
  IgntDialogRef,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { take } from 'rxjs/operators';

import { MemberAccountIdentification, MemberAccountMembership } from '../../models/member-account.model';
import { MemberAccountService } from '../../services/member-account.service';

export interface IdentifyMemberAccountModalData {
  memberships: Array<MemberAccountMembership>;
  partnerId: number;
}

export type IdentifyMemberAccountModalResult = MemberAccountIdentification | null | undefined;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslateModule,
    ReactiveFormsModule,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntButtonComponent,
    IgntDialogHeaderComponent,
    IgntDialogContentComponent,
    IgntDialogFooterComponent,
  ],
  selector: 'app-identify-member-account-modal',
  standalone: true,
  styleUrl: './identify-member-account-modal.component.scss',
  templateUrl: './identify-member-account-modal.component.html',
})
export class IdentifyMemberAccountModalComponent {
  readonly #changeDetectorRef = inject(ChangeDetectorRef);
  readonly #data = inject<IdentifyMemberAccountModalData>(IGNT_DIALOG_DATA);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject<IgntDialogRef<IdentifyMemberAccountModalResult>>(IGNT_DIALOG_REF);
  readonly #formBuilder = inject(NonNullableFormBuilder);
  readonly #memberAccountService = inject(MemberAccountService);

  protected readonly currentMemberships: Array<MemberAccountMembership> = this.#data.memberships ?? [];
  protected readonly isLoading = signal(false);

  protected readonly formGroup = this.#formBuilder.group({ value: ['', [Validators.required]] });

  protected closeModal(): void {
    this.#dialogRef.close(null);
  }

  protected getValue(): string {
    return this.formGroup.controls.value.value;
  }

  protected identify(): void {
    if (this.isLoading()) {
      return;
    }

    this.#clearServerError();
    if (!this.formGroup.valid) {
      return;
    }

    const value: string = this.getValue().trim();
    if (!value) {
      return;
    }

    this.isLoading.set(true);
    this.#memberAccountService
      .identify$(this.#data.partnerId, value)
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (response: BaseResponse<unknown>) => this.#setFieldError(response?.error?.message ?? 'errors.generic'),
        next: (response: BaseResponse<Array<MemberAccountMembership>>) => this.#settle(value, response),
      });
  }

  #clearServerError(): void {
    const valueControl = this.formGroup.get('value');
    const errors = valueControl?.errors;
    if (valueControl == null || errors == null || errors['serverError'] == null) {
      return;
    }
    const remainingErrors = Object.fromEntries(Object.entries(errors).filter(([errorKey]) => errorKey !== 'serverError'));
    valueControl.setErrors(Object.keys(remainingErrors).length > 0 ? remainingErrors : null);
  }

  #setFieldError(errorMessage: string): void {
    const valueControl = this.formGroup.get('value');

    valueControl?.setErrors({
      ...(valueControl?.errors ?? {}),
      serverError: errorMessage,
    });

    this.isLoading.set(false);
    this.#changeDetectorRef.markForCheck();
  }

  #settle(value: string, response: BaseResponse<Array<MemberAccountMembership>>): void {
    if (response?.error) {
      this.#setFieldError(response.error.message ?? 'errors.generic');
      return;
    }

    const memberships: Array<MemberAccountMembership> = response?.data ?? [];
    if (memberships.length === 0) {
      this.#setFieldError('boxOffice.memberAccount.modal.noMemberships');
      return;
    }

    this.isLoading.set(false);
    this.#dialogRef.close({ memberships, value });
  }
}
