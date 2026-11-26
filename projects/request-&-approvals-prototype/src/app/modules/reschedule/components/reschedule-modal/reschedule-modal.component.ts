import { DialogRef } from '@angular/cdk/dialog';
import { NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, UntypedFormGroup, Validators } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { IgntRadioGroupComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio-group.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { TranslateModule } from '@ngx-translate/core';

import { RescheduleTypeEnum } from '../../models/reschedule-type.enum';

@Component({
  selector: 'app-reschedule-modal',
  templateUrl: './reschedule-modal.component.html',
  styleUrls: ['./reschedule-modal.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    IgntButtonComponent,
    ReactiveFormsModule,
    FontAwesomeModule,
    IgntListItemComponent,
    IgntRadioComponent,
    IgntRadioGroupComponent,
    NgFor,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class RescheduleModalComponent {
  #dialog = inject(DialogRef) as DialogRef<RescheduleTypeEnum, unknown>;
  formGroup: UntypedFormGroup;
  rescheduleFlows: { value: RescheduleTypeEnum }[] = [];

  constructor(private fb: NonNullableFormBuilder) {
    for (const type of Object.values(RescheduleTypeEnum)) {
      this.rescheduleFlows.push({
        value: type,
      });
    }
    this.formGroup = this.fb.group({
      rescheduleFlow: ['', Validators.required],
    });
  }

  onCancel() {
    this.#dialog.close(undefined);
  }

  onSubmit() {
    const rescheduleFlowControl = this.formGroup.get('rescheduleFlow');
    this.#dialog.close(rescheduleFlowControl?.value);
  }

  selectRescheduleFlow(rescheduleFlowSelected: RescheduleTypeEnum): void {
    this.formGroup.patchValue({
      rescheduleFlow: rescheduleFlowSelected,
    });
  }
}
