import { NgIf, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ErrorAmbassadorRegisterFormEvent } from '@fz-original/app/core/tracking/core/events/error-ambassador-register-form';
import { LoadAmbassadorsRegisterPageEvent } from '@fz-original/app/core/tracking/core/events/load-ambassadors-register-page';
import { SuccessAmbassadorRegisterFormEvent } from '@fz-original/app/core/tracking/core/events/success-ambassador-register-form';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { emailValidator } from '@fz-original/app/shared/validators/email.validator';
import { IgntButtonComponent } from '@ignite/common';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntRatingComponent } from '@ignite/legacy/components/ignt-rating/ignt-rating.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { BaseResponse } from '../../../../shared/models/base-response';
import { PlanDetailPublic } from '../../../../shared/models/plan/plan.model';
import { SanitizePipe } from '../../../../shared/pipes/sanitize/sanitize.pipe';
import { matchSameValueValidator } from '../../../../shared/validators/match-same-value.validator';
import { AmbassadorRegisterFormResponse, AmbassadorRegisterStatus } from '../../services/ambassador-register.model';
import { AmbassadorsService } from '../../services/ambassadors.service';
import { AmbassadorRegisterMessageComponent } from './ambassador-register-message/ambassador-register-message.component';

@Component({
  selector: 'app-ambassador-register',
  standalone: true,
  templateUrl: './ambassador-register.component.html',
  styleUrls: ['./ambassador-register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntRatingComponent,
    IgntWrapperCardComponent,
    NgOptimizedImage,
    IgntInputFieldComponent,
    IgntButtonComponent,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    NgIf,
    AmbassadorRegisterMessageComponent,
    FontAwesomeModule,
    SanitizePipe,
  ],
})
export class AmbassadorRegisterComponent implements OnInit {
  #ambassadorsService = inject(AmbassadorsService);
  #changeDetectorRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  #formBuilder = inject(FormBuilder);
  #route = inject(ActivatedRoute);
  #translateService = inject(TranslateService);

  ambassadorAlreadyExistingUserError = false;
  ambassadorCreatedError = false;
  ambassadorCreatedPendingUser = false;
  ambassadorCreatedSuccessfully = false;
  formGroup: FormGroup = this.#formBuilder.group(
    {
      fullName: [null, [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      email: [null, [Validators.required, emailValidator(this.#translateService.instant('form.error.invalidEmail'))]],
      repeatEmail: [null, [Validators.required, emailValidator(this.#translateService.instant('form.error.invalidEmail'))]],
      termsAndConditions: [false, [Validators.requiredTrue]],
    },
    {
      validators: [matchSameValueValidator('email', 'repeatEmail')],
    },
  );
  plan: PlanDetailPublic = this.#route.snapshot.data.planDetailPublic;
  submittingForm = false;

  constructor(private trackingService: TrackingService) {}

  ngOnInit() {
    this.trackingService.track(new LoadAmbassadorsRegisterPageEvent({ plan_id: this.plan.id }));
  }

  onSubmitForm() {
    this.formGroup.markAllAsTouched();
    this.formGroup.controls.email.updateValueAndValidity();
    this.formGroup.controls.repeatEmail.updateValueAndValidity();
    this.formGroup.controls.fullName.updateValueAndValidity();
    if (this.formGroup.valid) {
      this.submittingForm = true;
      this.#ambassadorsService.createAmbassador(this.plan.id, this.formGroup.value).subscribe({
        next: (data: BaseResponse<AmbassadorRegisterFormResponse>) => {
          if (data.data?.status) {
            this.#onSubmitFormSuccess(data.data.status);
            this.trackingService.track(
              new SuccessAmbassadorRegisterFormEvent({
                plan_id: this.plan.id,
                name: this.formGroup.controls.fullName.value,
                email: this.formGroup.controls.email.value,
              }),
            );
          } else {
            this.trackingService.track(
              new ErrorAmbassadorRegisterFormEvent({
                plan_id: this.plan.id,
                name: this.formGroup.controls.fullName.value,
                email: this.formGroup.controls.email.value,
              }),
            );
            this.#onSubmitFormFailure();
          }
        },
        error: () => {
          this.trackingService.track(
            new ErrorAmbassadorRegisterFormEvent({
              plan_id: this.plan.id,
              name: this.formGroup.controls.fullName.value,
              email: this.formGroup.controls.email.value,
            }),
          );
          this.#onSubmitFormFailure();
        },
      });
    }
  }

  tryAgain() {
    this.formGroup.reset();
    this.ambassadorCreatedError = false;
    this.ambassadorCreatedSuccessfully = false;
  }

  #onSubmitFormFailure() {
    this.ambassadorCreatedError = true;
    this.submittingForm = false;
    this.#changeDetectorRef.detectChanges();
  }

  #onSubmitFormSuccess(ambassadorStatus: AmbassadorRegisterStatus) {
    this.submittingForm = false;

    if (ambassadorStatus === AmbassadorRegisterStatus.USER_CONFIRMED) {
      this.ambassadorCreatedSuccessfully = true;
      this.#changeDetectorRef.detectChanges();
      return;
    }
    if (ambassadorStatus === AmbassadorRegisterStatus.INITIATED) {
      this.ambassadorCreatedPendingUser = true;
      this.#changeDetectorRef.detectChanges();
      return;
    }
  }
}
