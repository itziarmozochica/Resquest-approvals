import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { OnsiteContactInformationFieldsOrderComponent } from '@fz-original/app/modules/box-office/settings/components/onsite-setup-form/onsite-contact-information-fields-order/onsite-contact-information-fields-order.component';
import {
  ContactInformationFieldEnum,
  ContactInformationOrderableFieldEnum,
  ContactInformationRequirementEnum,
} from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import {
  hasContactInformationFields,
  OnsiteContactInformationSetupValue,
  toggleContactInformationField,
} from '@fz-original/app/modules/box-office/shared/utils/contact-information-setup.util';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { FilterSelectModule } from '@fz-original/app/shared/layout/filters/select/select.module';
import { IgntAlertComponent, IgntSwitchComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

const FIELD_LABELS: Record<ContactInformationFieldEnum, string> = {
  [ContactInformationFieldEnum.EMAIL]: 'boxOffice.settings.actions.onsiteSetup.contactInformationSetup.fields.email',
  [ContactInformationFieldEnum.PHONE]: 'boxOffice.settings.actions.onsiteSetup.contactInformationSetup.fields.phone',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FilterSelectModule,
    IgntAlertComponent,
    IgntCheckboxComponent,
    IgntIconComponent,
    IgntSwitchComponent,
    OnsiteContactInformationFieldsOrderComponent,
    TranslateModule,
  ],
  selector: 'app-onsite-contact-information-setup',
  styleUrls: [
    '../../../../../sessions/shared/components/common-edit-form/common-edit-form.component.scss',
    './onsite-contact-information-setup.component.scss',
  ],
  templateUrl: './onsite-contact-information-setup.component.html',
})
export class OnsiteContactInformationSetupComponent {
  readonly #translateService = inject(TranslateService);

  readonly value = input.required<OnsiteContactInformationSetupValue>();
  readonly fieldsConfigurable = input(true);
  readonly valueChange = output<OnsiteContactInformationSetupValue>();

  protected readonly fieldOptions = computed(() =>
    Object.values(ContactInformationFieldEnum).map(field => ({
      checked: this.value().fields.includes(field),
      id: field,
      title: FIELD_LABELS[field],
    })),
  );
  protected readonly hasFields = computed(() => hasContactInformationFields(this.value()));
  protected readonly isEnabled = computed(() => this.value().requirement !== ContactInformationRequirementEnum.DISABLED);
  protected readonly isOptional = computed(() => this.value().requirement === ContactInformationRequirementEnum.OPTIONAL);
  protected readonly requirementOptions: SelectOption[] = [
    ContactInformationRequirementEnum.OPTIONAL,
    ContactInformationRequirementEnum.REQUIRED,
  ].map(requirement => ({
    id: requirement,
    title: this.#translateService.instant(`boxOffice.settings.actions.onsiteSetup.contactInformationSetup.requirement.${requirement}`),
  }));
  protected readonly selectedRequirementOption = computed(
    () => this.requirementOptions.find(option => option.id === this.value().requirement) ?? undefined,
  );

  protected selectFieldsOrder(fieldsOrder: ContactInformationOrderableFieldEnum[]): void {
    this.valueChange.emit({ ...this.value(), fieldsOrder });
  }

  protected selectRequirement(option: SelectOption): void {
    const requirement =
      option.id === ContactInformationRequirementEnum.REQUIRED
        ? ContactInformationRequirementEnum.REQUIRED
        : ContactInformationRequirementEnum.OPTIONAL;
    if (requirement !== this.value().requirement) {
      this.valueChange.emit({ ...this.value(), requirement });
    }
  }

  protected toggleField(field: ContactInformationFieldEnum): void {
    this.valueChange.emit(toggleContactInformationField(this.value(), field));
  }

  protected toggleRequirement(): void {
    const requirement = this.isEnabled() ? ContactInformationRequirementEnum.DISABLED : ContactInformationRequirementEnum.OPTIONAL;
    this.valueChange.emit({ ...this.value(), requirement });
  }
}
