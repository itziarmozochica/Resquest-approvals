import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

import { FormEmailModel } from '../../../../../shared/layout/form/form-email.model';
import { FormEmailService } from '../../../../../shared/layout/form/form-email.service';

@Component({
  selector: 'app-plan-dashboard-new-name',
  standalone: false,
  styleUrls: ['./new-name-modal.component.scss'],
  templateUrl: './new-name-modal.component.html',
})
export class NewNameComponent implements OnInit {
  newNameForm!: UntypedFormGroup;
  error = false;
  success = false;

  @Input() emailInfo?: FormEmailModel;
  @Input() defaultName?: string;

  constructor(
    private formEmailService: FormEmailService,
    private fb: UntypedFormBuilder,
  ) {}

  ngOnInit(): void {
    if (!this.emailInfo || this.defaultName === undefined) {
      return;
    }

    this.newNameForm = this.fb.group({
      name: [this.defaultName, [Validators.required]],
    });

    this.emailInfo.dynamicContent = [
      {
        name: 'name',
        formValue: 'newName',
      },
    ];
  }

  submitNewNameForm(): void {
    if (!this.emailInfo) {
      return;
    }

    this.error = false;
    this.formEmailService.sendEmail(this.emailInfo, this.newNameForm).subscribe(
      () => {
        this.success = true;
      },
      () => {
        this.error = true;
      },
    );
  }
}
