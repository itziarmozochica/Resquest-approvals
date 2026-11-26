import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import {
  BulkEditPropertyOption,
  BulkEditPropertySection,
  BulkEditPropertySectionGroup,
} from '@fz-original/app/modules/inventory/inventory-ticket-types/inventory-ticket-types-bulk-edit/models/inventory-ticket-types-bulk-edit.model';
import {
  SessionTypeBulkEditProperty,
  SessionTypeBulkEditPropertyValue,
} from '@fz-original/app/shared/services/sessions/session-type.model';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

const BULK_EDIT_PROPERTY_OPTIONS: BulkEditPropertyOption[] = [
  { property: SessionTypeBulkEditProperty.productType, section: BulkEditPropertySection.basicSettings },
  { property: SessionTypeBulkEditProperty.group, section: BulkEditPropertySection.basicSettings },
  { property: SessionTypeBulkEditProperty.instructions, section: BulkEditPropertySection.content },
  { property: SessionTypeBulkEditProperty.details, section: BulkEditPropertySection.content },
  { property: SessionTypeBulkEditProperty.selectionRule, section: BulkEditPropertySection.conditionalRules },
  { property: SessionTypeBulkEditProperty.allowedNumTickets, section: BulkEditPropertySection.advanced },
  { property: SessionTypeBulkEditProperty.targetAttendee, section: BulkEditPropertySection.advanced },
  { isSuperuserOnly: true, property: SessionTypeBulkEditProperty.ticketTier, section: BulkEditPropertySection.advanced },
];

const BULK_EDIT_PROPERTY_SECTIONS = [
  BulkEditPropertySection.basicSettings,
  BulkEditPropertySection.content,
  BulkEditPropertySection.conditionalRules,
  BulkEditPropertySection.advanced,
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntCheckboxComponent, IgntInputFieldComponent, ReactiveFormsModule, TranslateModule],
  selector: 'app-bulk-edit-properties-step',
  standalone: true,
  styleUrl: './bulk-edit-properties-step.component.scss',
  templateUrl: './bulk-edit-properties-step.component.html',
})
export class BulkEditPropertiesStepComponent {
  readonly hiddenProperties = input<SessionTypeBulkEditPropertyValue[]>([]);
  readonly isSuperuser = input.required<boolean>();
  readonly propertyOptions = input<readonly BulkEditPropertyOption[]>(BULK_EDIT_PROPERTY_OPTIONS);
  readonly restrictedProperties = input<SessionTypeBulkEditPropertyValue[]>([]);
  readonly selectedProperties = input.required<SessionTypeBulkEditPropertyValue[]>();
  readonly selectionChange = output<SessionTypeBulkEditPropertyValue[]>();

  readonly searchControl = new FormControl<string>('', { nonNullable: true });

  readonly #translate = inject(TranslateService);
  readonly #search = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  readonly #selectedPropertySet = computed(() => new Set(this.selectedProperties()));
  readonly #restrictedPropertySet = computed(() => new Set(this.restrictedProperties()));

  readonly filteredSections = computed<BulkEditPropertySectionGroup[]>(() => {
    const search = this.#search().trim().toLowerCase();
    const isSuperuser = this.isSuperuser();
    const restricted = this.#restrictedPropertySet();
    const hidden = new Set(this.hiddenProperties());

    const availableOptions = this.propertyOptions().filter(
      option => (isSuperuser || option.isSuperuserOnly !== true) && !hidden.has(option.property),
    );
    const combinedFollowers = new Set(availableOptions.flatMap(option => option.combinedWith ?? []));

    return BULK_EDIT_PROPERTY_SECTIONS.map(section => ({
      options: availableOptions
        .filter(option => option.section === section && !combinedFollowers.has(option.property))
        .filter(option => search.length === 0 || this.#getPropertyTitleForSearch(option).toLowerCase().includes(search))
        .map(option => ({
          ...option,
          descriptionKey: option.descriptionKey ?? `inventory.ticketTypes.bulkEdit.properties.${option.property}.description`,
          disabled: restricted.has(option.property) || (option.combinedWith ?? []).some(property => restricted.has(property)),
          titleKey: option.titleKey ?? `inventory.ticketTypes.bulkEdit.properties.${option.property}.title`,
        })),
      section,
    })).filter(sectionGroup => sectionGroup.options.length > 0);
  });

  isPropertySelected(property: SessionTypeBulkEditPropertyValue): boolean {
    const selected = this.#selectedPropertySet();
    if (!selected.has(property)) {
      return false;
    }

    const option = this.propertyOptions().find(propertyOption => propertyOption.property === property);
    return (option?.combinedWith ?? []).every(combinedProperty => selected.has(combinedProperty));
  }

  toggleProperty(property: SessionTypeBulkEditPropertyValue, isChecked: boolean): void {
    const restricted = this.#restrictedPropertySet();
    if (restricted.has(property)) {
      return;
    }

    const option = this.propertyOptions().find(propertyOption => propertyOption.property === property);
    const groupedProperties = [property, ...(option?.combinedWith ?? [])];
    if (groupedProperties.some(groupedProperty => restricted.has(groupedProperty))) {
      return;
    }

    const selectedProperties = new Set(this.selectedProperties());

    for (const groupedProperty of groupedProperties) {
      if (isChecked) {
        selectedProperties.add(groupedProperty);
      } else {
        selectedProperties.delete(groupedProperty);
      }
    }

    this.selectionChange.emit([...selectedProperties]);
  }

  #getPropertyTitleForSearch(option: BulkEditPropertyOption): string {
    return this.#translate.instant(option.titleKey ?? `inventory.ticketTypes.bulkEdit.properties.${option.property}.title`);
  }
}
