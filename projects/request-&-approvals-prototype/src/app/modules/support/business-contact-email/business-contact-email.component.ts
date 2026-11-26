import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { IgntAlertComponent } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { IconsModule } from '../../../shared/icons/icons.module';
import { BusinessFormEmailModel } from '../../../shared/layout/form/form-email.model';
import { FormEmailService } from '../../../shared/layout/form/form-email.service';
import { Partner } from '../../../shared/models/partner/partner.model';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { UserService } from '../../../shared/services/user/user.service';
import { Business } from '../../settings/shared/models/business.model';

@Component({
  selector: 'app-business-contact-email',
  templateUrl: './business-contact-email.component.html',
  styleUrls: ['./business-contact-email.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAlertComponent,
    NgIf,
    ReactiveFormsModule,
    TranslateModule,
    IgntWrapperCardComponent,
    IgntInputFieldComponent,
    IgntButtonComponent,
    IconsModule,
    IgntTextareaFieldComponent,
  ],
})
export class BusinessContactEmailComponent implements OnInit, OnDestroy {
  #emailInfo: BusinessFormEmailModel;
  #partner: Partner | null = null;
  #business?: Business;
  #destroy$: Subject<void> = new Subject<void>();

  #partnerService: PartnerService = inject(PartnerService);
  #fb: UntypedFormBuilder = inject(UntypedFormBuilder);
  #formEmailService: FormEmailService = inject(FormEmailService);
  #userService: UserService = inject(UserService);
  #route: ActivatedRoute = inject(ActivatedRoute);
  #changeDetectorRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  supportForm: UntypedFormGroup;
  error = false;
  success = false;
  sending = false;

  ngOnInit(): void {
    this.#partner = this.#partnerService.getPartner();
    this.#business = this.#userService.getUser()?.business;

    const email = this.#business?.email || '';
    this.supportForm = this.#fb.group({
      email: [email, [Validators.required, Validators.email]],
      comments: [null, [Validators.required]],
      reservationId: [null],
      planName: [null],
    });

    this.#emailInfo = this.#buildEmailConfiguration('Send us a message - Groups', environment.formspree.supportGroupsForm);
    this.#emailInfo.dynamicContent = [
      {
        name: 'email',
        formValue: 'Email',
      },
      {
        name: 'comments',
        formValue: 'Comments',
      },
      {
        name: 'reservationId',
        formValue: 'Reservation ID',
      },
      {
        name: 'planName',
        formValue: 'Plan Name',
      },
    ];

    this.#route.queryParams
      .pipe(takeUntil(this.#destroy$))
      .subscribe(({ planName, businessId, businessEmail, partnerName, reservationId, partnerId }) => {
        this.supportForm.get('reservationId')?.setValue(reservationId);
        this.supportForm.get('planName')?.setValue(planName);
        this.supportForm.get('email')?.setValue(businessEmail);

        this.#emailInfo.content.businessId = this.#emailInfo.content.businessId || businessId;
        this.#emailInfo.content.partnerName = this.#emailInfo.content.partnerName || partnerName;
        this.#emailInfo.content.partnerId = this.#emailInfo.content.partnerId || partnerId;
      });
  }

  ngOnDestroy(): void {
    this.#destroy$.next();
    this.#destroy$.complete();
  }

  submitSupportForm(): void {
    if (this.supportForm.valid && !this.sending) {
      this.sending = true;
      this.error = false;
      this.#formEmailService.sendEmail(this.#emailInfo, this.supportForm).subscribe(
        () => {
          this.success = true;
          this.sending = false;
          this.#changeDetectorRef.detectChanges();
        },
        () => {
          this.error = true;
          this.sending = false;
          this.#changeDetectorRef.detectChanges();
        },
      );
    } else {
      this.supportForm.markAllAsTouched();
      this.supportForm.get('email')?.updateValueAndValidity();
      this.supportForm.get('comments')?.updateValueAndValidity();
    }
  }

  #buildEmailConfiguration(subject: string, formId: string): BusinessFormEmailModel {
    return {
      content: {
        partnerId: this.#partner?.id?.toString() ?? '',
        partnerName: this.#partner?.name ?? '',
        businessId: this.#business?.id ?? '',
        planId: '',
        planName: '',
        _subject: subject,
      },
      formId,
    };
  }
}
