import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

import { IgntAlertComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { environment } from '../../../../environments/environment';
import { FormEmailModel } from '../../../shared/layout/form/form-email.model';
import { FormEmailService } from '../../../shared/layout/form/form-email.service';
import { Partner } from '../../../shared/models/partner/partner.model';
import { PartnerService } from '../../../shared/services/partner/partner.service';

@Component({
  selector: 'app-contact-email',
  templateUrl: './contact-email.component.html',
  styleUrls: ['./contact-email.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, ReactiveFormsModule, TranslateModule, NgIf],
})
export class ContactEmailComponent implements OnInit {
  #emailInfo: FormEmailModel;
  #partner: Partner | null = null;

  #partnerService: PartnerService = inject(PartnerService);
  #fb: UntypedFormBuilder = inject(UntypedFormBuilder);
  #formEmailService: FormEmailService = inject(FormEmailService);
  #changeDetectorRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  supportForm: UntypedFormGroup;
  error = false;
  success = false;

  ngOnInit(): void {
    this.#partner = this.#partnerService.getPartner();
    this.supportForm = this.#fb.group({
      email: [null, [Validators.required, Validators.email]],
      comments: [null, [Validators.required]],
    });

    this.#emailInfo = this.#buildEmailConfiguration('Send us a message', environment.formspree.supportForm);
    this.#emailInfo.dynamicContent = [
      {
        name: 'email',
        formValue: 'Email',
      },
      {
        name: 'comments',
        formValue: 'Comments',
      },
    ];
  }

  submitSupportForm(): void {
    this.error = false;
    this.#formEmailService.sendEmail(this.#emailInfo, this.supportForm).subscribe(
      () => {
        this.success = true;
        this.#changeDetectorRef.detectChanges();
      },
      () => {
        this.error = true;
        this.#changeDetectorRef.detectChanges();
      },
    );
  }

  #buildEmailConfiguration(subject: string, formId: string): FormEmailModel {
    return {
      content: {
        planId: '',
        planName: '',
        partnerId: this.#partner?.id?.toString() ?? '',
        partnerName: this.#partner?.name ?? '',
        _subject: subject,
      },
      formId,
    };
  }
}
