import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPlaceholder, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';

import { ContactInformationOrderableFieldEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

const FIELD_LABELS: Record<ContactInformationOrderableFieldEnum, string> = {
  [ContactInformationOrderableFieldEnum.FIRST_NAME]: 'boxOffice.settings.actions.onsiteSetup.contactInformationSetup.fields.firstName',
  [ContactInformationOrderableFieldEnum.LAST_NAME]: 'boxOffice.settings.actions.onsiteSetup.contactInformationSetup.fields.lastName',
  [ContactInformationOrderableFieldEnum.EMAIL]: 'boxOffice.settings.actions.onsiteSetup.contactInformationSetup.fields.email',
  [ContactInformationOrderableFieldEnum.PHONE]: 'boxOffice.settings.actions.onsiteSetup.contactInformationSetup.fields.phone',
};

@Component({
  selector: 'app-onsite-contact-information-fields-order',
  imports: [TranslateModule, CdkDropList, CdkDrag, CdkDragHandle, CdkDragPlaceholder, IgntIconComponent],
  templateUrl: './onsite-contact-information-fields-order.component.html',
  styleUrl: './onsite-contact-information-fields-order.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnsiteContactInformationFieldsOrderComponent {
  readonly fieldsOrder = input.required<ContactInformationOrderableFieldEnum[]>();
  readonly selected = output<ContactInformationOrderableFieldEnum[]>();

  protected readonly fieldLabels = FIELD_LABELS;
  protected readonly orderedFields = linkedSignal(() => this.fieldsOrder());

  protected dropField({ previousIndex, currentIndex }: CdkDragDrop<ContactInformationOrderableFieldEnum[]>): void {
    const reordered: ContactInformationOrderableFieldEnum[] = [...this.orderedFields()];
    moveItemInArray(reordered, previousIndex, currentIndex);
    this.orderedFields.set(reordered);
    this.selected.emit(reordered);
  }
}
