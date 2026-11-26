import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

import { ScannerViewComponent } from '@fz-original/app/modules/validation/components/scanner/scanner-view/scanner-view.component';
import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';
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
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { EMPTY, of } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';

import { MembershipsData, MembershipsMember, PlanDiscount } from '../../models/memberships.model';
import { OBOMembershipsService } from '../../services/memberships.service';

export interface MembershipsIdentifyMemberModalData {
  partnerId: number;
  planId: number;
}

export type MembershipsIdentifyMemberModalResult = MembershipsData | null | undefined;

@Component({
  selector: 'app-memberships-identify-member-modal',
  templateUrl: './identify-member-modal.component.html',
  styleUrls: ['./identify-member-modal.component.scss'],
  imports: [
    TranslateModule,
    ReactiveFormsModule,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntButtonComponent,
    IgntIconButtonComponent,
    IgntDialogHeaderComponent,
    IgntDialogContentComponent,
    IgntDialogFooterComponent,
    ScannerViewComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipsIdentifyMemberModalComponent implements OnInit {
  readonly #changeDetectorRef = inject(ChangeDetectorRef);
  readonly #data = inject<MembershipsIdentifyMemberModalData>(IGNT_DIALOG_DATA);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject<IgntDialogRef<MembershipsIdentifyMemberModalResult>>(IGNT_DIALOG_REF);
  readonly #formBuilder = inject(UntypedFormBuilder);
  readonly #membershipsService = inject(OBOMembershipsService);

  protected readonly isLoading = signal(false);
  protected readonly isScanning = signal(false);

  protected formGroup!: UntypedFormGroup;

  ngOnInit(): void {
    this.formGroup = this.#formBuilder.group({ memberCode: [null, [Validators.required]] });
  }

  protected addMember(): void {
    this.#clearServerError();
    if (!this.formGroup.valid) {
      return;
    }

    const memberCode: string = this.getMemberCodeValue().trim();
    if (!memberCode) {
      return;
    }

    const membershipsData: MembershipsData = {
      memberCode,
      member: null,
      planDiscounts: [],
    };

    const { partnerId, planId } = this.#data;

    this.isLoading.set(true);
    this.#membershipsService
      .getMemberByPartnerAndMemberCode(memberCode, partnerId)
      .pipe(
        switchMap((response: BaseResponse<MembershipsMember>) => {
          if (!response?.data) {
            this.#setErrors(response?.error);
            return EMPTY;
          }

          membershipsData.member = response.data;
          return this.#membershipsService.getDiscountCodesByPartnerAndMemberCode(memberCode, partnerId).pipe(
            switchMap((discountCodesResponse: BaseResponse<Array<string>>) => {
              if (!discountCodesResponse?.data?.length) {
                return of(membershipsData);
              }

              const discountCodes: Array<string> = discountCodesResponse.data;
              return this.#membershipsService.getPlanDiscountsByPartnerAndPlanId(planId, partnerId).pipe(
                switchMap((planDiscountsResponse: BaseResponse<Array<PlanDiscount>>) => {
                  if (!planDiscountsResponse?.data?.length) {
                    return of(membershipsData);
                  }

                  membershipsData.planDiscounts = planDiscountsResponse.data.filter((planDiscount: PlanDiscount) =>
                    discountCodes.includes(planDiscount.couponCode),
                  );
                  return of(membershipsData);
                }),
                catchError(() => of(membershipsData)),
              );
            }),
            catchError(() => of(membershipsData)),
          );
        }),
        take(1),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (membershipsData: MembershipsData | void): void => {
          if (membershipsData) {
            this.isLoading.set(false);
            this.#dialogRef.close(membershipsData);
          }
        },
        error: (response: BaseResponse<unknown>) => {
          this.#setErrors(response?.error);
        },
      });
  }

  protected closeModal(): void {
    this.#dialogRef.close(null);
  }

  protected getMemberCodeValue(): string {
    return this.formGroup.get('memberCode')?.value ?? '';
  }

  protected openScanner(): void {
    this.isScanning.set(true);
  }

  protected closeScanner(): void {
    this.isScanning.set(false);
  }

  protected onScanned(memberCode: string): void {
    this.isScanning.set(false);
    if (memberCode) {
      this.formGroup.get('memberCode')!.setValue(memberCode);
    }
  }

  /** Drops the error the previous submit left on the field, so a retry starts clean. */
  #clearServerError(): void {
    const memberCodeControl = this.formGroup.get('memberCode');
    const errors = memberCodeControl?.errors;
    if (memberCodeControl == null || errors == null || errors['serverError'] == null) {
      return;
    }
    const remainingErrors = Object.fromEntries(Object.entries(errors).filter(([errorKey]) => errorKey !== 'serverError'));
    memberCodeControl.setErrors(Object.keys(remainingErrors).length > 0 ? remainingErrors : null);
  }

  #setErrors(errorResponse?: BaseErrorResponse): void {
    const memberCodeControl = this.formGroup.get('memberCode');
    const errorMessage = errorResponse?.message ?? 'errors.generic';

    memberCodeControl?.setErrors({
      ...(memberCodeControl?.errors ?? {}),
      serverError: errorMessage,
    });

    this.isLoading.set(false);
    this.#changeDetectorRef.markForCheck();
  }
}
