import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

import { FormEmailModel } from '../../../../../shared/layout/form/form-email.model';
import { FormEmailService } from '../../../../../shared/layout/form/form-email.service';

@Component({
  selector: 'app-plan-dashboard-new-description',
  standalone: false,
  styleUrls: ['./new-description-modal.component.scss'],
  templateUrl: './new-description-modal.component.html',
})
export class NewDescriptionComponent implements OnInit {
  newDescriptionForm!: UntypedFormGroup;
  error = false;
  success = false;

  @Input() emailInfo?: FormEmailModel;
  @Input() defaultDescription?: string;

  constructor(
    private formEmailService: FormEmailService,
    private fb: UntypedFormBuilder,
  ) {}

  ngOnInit(): void {
    if (!this.emailInfo || this.defaultDescription === undefined) {
      return;
    }

    this.newDescriptionForm = this.fb.group({
      description: [this.removeHtmlMarkup(this.defaultDescription), [Validators.required]],
    });

    this.emailInfo.dynamicContent = [
      {
        name: 'description',
        formValue: 'newDescription',
      },
    ];
  }

  private removeHtmlMarkup(htmlText: string): string {
    return htmlText.replace(/<br\s\/>/gi, '\n').replace(/<\/?[^>]+>/gi, '');
  }

  submitDescriptionForm(): void {
    if (!this.emailInfo) {
      return;
    }

    this.error = false;
    this.formEmailService.sendEmail(this.emailInfo, this.newDescriptionForm).subscribe(
      () => {
        this.success = true;
      },
      () => {
        this.error = true;
      },
    );
  }
}
