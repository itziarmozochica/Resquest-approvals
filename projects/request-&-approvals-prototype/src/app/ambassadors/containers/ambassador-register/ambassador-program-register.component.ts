import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AmbassadorProgram } from '@fz-original/app/ambassadors/models/ambassador-program.model';
import { ErrorAmbassadorRegisterFormEvent } from '@fz-original/app/core/tracking/core/events/error-ambassador-register-form';
import { LoadAmbassadorsRegisterPageEvent } from '@fz-original/app/core/tracking/core/events/load-ambassadors-register-page';
import { SuccessAmbassadorRegisterFormEvent } from '@fz-original/app/core/tracking/core/events/success-ambassador-register-form';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { AmbassadorRegisterMessageComponent } from '@fz-original/app/modules/ambassador-register/components/ambassador-register/ambassador-register-message/ambassador-register-message.component';
import {
  AmbassadorRegisterFormResponse,
  AmbassadorRegisterStatus,
} from '@fz-original/app/modules/ambassador-register/services/ambassador-register.model';
import { AmbassadorsService } from '@fz-original/app/modules/ambassador-register/services/ambassadors.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { SanitizePipe } from '@fz-original/app/shared/pipes/sanitize/sanitize.pipe';
import { emailValidator } from '@fz-original/app/shared/validators/email.validator';
import { matchSameValueValidator } from '@fz-original/app/shared/validators/match-same-value.validator';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-ambassador-program-register',
  standalone: true,
  templateUrl: './ambassador-program-register.component.html',
  styleUrls: ['./ambassador-program-register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    AmbassadorRegisterMessageComponent,
    FontAwesomeModule,
    IgntButtonComponent,
    IgntInputFieldComponent,
    IgntWrapperCardComponent,
    NgIf,
    ReactiveFormsModule,
    SanitizePipe,
    TranslateModule,
  ],
})
export class AmbassadorProgramRegisterComponent implements OnInit {
  #ambassadorsService: AmbassadorsService = inject(AmbassadorsService);
  #changeDetectorRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  #formBuilder: FormBuilder = inject(FormBuilder);
  #route: ActivatedRoute = inject(ActivatedRoute);
  #trackingService: TrackingService = inject(TrackingService);
  #translateService: TranslateService = inject(TranslateService);

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

  program: AmbassadorProgram = {} as AmbassadorProgram;
  submittingForm = false;

  isProgramActive(): boolean {
    return !this.isProgramExpired() && !this.isProgramUpcoming();
  }

  isProgramExpired(): boolean {
    const now = new Date();
    const programEnd = new Date(this.program.endsAt);

    return now > programEnd;
  }

  isProgramUpcoming(): boolean {
    const now = new Date();
    const programStart = new Date(this.program.startsAt);

    return now < programStart;
  }

  ngOnInit() {
    this.program = this.#route.snapshot.data.programDetailPublic;
    this.#trackingService.track(new LoadAmbassadorsRegisterPageEvent({ program_id: this.program.id }));
    this.#updateFormState();
  }

  onSubmitForm() {
    this.formGroup.markAllAsTouched();
    this.formGroup.controls.email.updateValueAndValidity();
    this.formGroup.controls.repeatEmail.updateValueAndValidity();
    this.formGroup.controls.fullName.updateValueAndValidity();
    if (this.formGroup.valid) {
      this.submittingForm = true;
      this.#ambassadorsService.createAmbassadorFromProgram(this.program.id, this.formGroup.value).subscribe({
        next: (data: BaseResponse<AmbassadorRegisterFormResponse>) => {
          if (data.data?.status) {
            this.#onSubmitFormSuccess(data.data.status);
            this.#trackingService.track(
              new SuccessAmbassadorRegisterFormEvent({
                program_id: this.program.id,
                name: this.formGroup.controls.fullName.value,
                email: this.formGroup.controls.email.value,
              }),
            );
          } else {
            this.#onSubmitFormFailure();
          }
        },
        error: () => {
          this.#onSubmitFormFailure();
        },
      });
    }
  }
  startDate(): string {
    return new Date(this.program.startsAt).toLocaleDateString();
  }

  #onSubmitFormFailure() {
    this.#trackingService.track(
      new ErrorAmbassadorRegisterFormEvent({
        program_id: this.program.id,
        name: this.formGroup.controls.fullName.value,
        email: this.formGroup.controls.email.value,
      }),
    );

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

  #updateFormState(): void {
    if (!this.isProgramActive()) {
      this.formGroup.disable();
    }
  }
}
