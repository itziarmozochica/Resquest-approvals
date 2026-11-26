import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

import { FormEmailModel } from '../../../../../shared/layout/form/form-email.model';
import { FormEmailService } from '../../../../../shared/layout/form/form-email.service';

@Component({
  selector: 'app-plan-dashboard-new-photo',
  standalone: false,
  styleUrls: ['./new-photo-modal.component.scss'],
  templateUrl: './new-photo-modal.component.html',
})
export class NewPhotoComponent implements OnInit {
  newPhotoForm!: UntypedFormGroup;
  error = false;
  success = false;

  @Input() emailInfo?: FormEmailModel;

  constructor(
    private formEmailService: FormEmailService,
    private fb: UntypedFormBuilder,
  ) {}

  ngOnInit(): void {
    if (!this.emailInfo) {
      return;
    }

    this.newPhotoForm = this.fb.group({
      photo: [null, [Validators.required]],
    });

    this.emailInfo.dynamicContent = [
      {
        name: 'photo',
        formValue: 'newPhoto',
      },
    ];
  }

  onChange(files: FileList): void {
    this.newPhotoForm.get('photo')?.setValue(files[0]);
  }

  submitNewPictureForm(): void {
    if (!this.emailInfo) {
      return;
    }

    this.error = false;
    this.formEmailService.sendEmail(this.emailInfo, this.newPhotoForm).subscribe(
      () => {
        this.success = true;
      },
      () => {
        this.error = true;
      },
    );
  }
}
