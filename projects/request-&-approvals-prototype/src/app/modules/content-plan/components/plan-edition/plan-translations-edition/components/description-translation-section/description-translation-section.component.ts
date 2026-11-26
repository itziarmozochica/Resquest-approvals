import { ChangeDetectionStrategy, Component, computed, inject, input, output, Signal } from '@angular/core';

import { COMPONENT_TYPES } from '@fz-original/app/modules/content-plan/components/plan-edition/description-builder/blocks/block-palette';
import { MaterialSymbolsFontLoader } from '@fz-original/app/modules/content-plan/components/plan-edition/description-builder/services/material-symbols-font-loader.service';
import { TranslationFieldCountBadgeComponent } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-translations-edition/components/translation-field-count-badge/translation-field-count-badge.component';
import { IgntAccordionBodyDirective, IgntAccordionComponent, IgntAccordionItemComponent, IgntAccordionVariant } from '@ignite/common';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import {
  DescriptionField,
  DescriptionFieldChange,
  DescriptionFieldGroup,
  DescriptionSection,
} from '../../models/description-translation.model';
import { DescriptionTranslationFieldComponent } from '../description-translation-field/description-translation-field.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslateModule,
    IgntAccordionComponent,
    IgntAccordionItemComponent,
    IgntAccordionBodyDirective,
    IgntTabsComponent,
    IgntTabsItemComponent,
    TranslationFieldCountBadgeComponent,
    DescriptionTranslationFieldComponent,
  ],
  selector: 'app-description-translation-section',
  standalone: true,
  styleUrl: './description-translation-section.component.scss',
  templateUrl: './description-translation-section.component.html',
})
export class DescriptionTranslationSectionComponent {
  readonly #materialSymbolsFont = inject(MaterialSymbolsFontLoader);

  readonly section = input.required<DescriptionSection>();
  readonly uploadFileCallback = input.required<(file: File) => Observable<string>>();
  readonly expanded = input<boolean>(false);
  readonly hideOriginal = input<boolean>(false);
  readonly showStatus = input<boolean>(true);
  readonly readOnly = input<boolean>(false);
  readonly selectedItemIndex = input<number>(0);

  readonly fieldChange = output<DescriptionFieldChange>();
  readonly itemSelected = output<number>();
  readonly toggled = output<void>();
  readonly validate = output<DescriptionField>();

  protected readonly COMPONENT_TYPES = COMPONENT_TYPES;

  constructor() {
    this.#materialSymbolsFont.ensureLoaded();
  }

  protected readonly variant: Signal<IgntAccordionVariant> = computed<IgntAccordionVariant>(() => (this.hideOriginal() ? 'band' : 'card'));

  protected readonly rootGroups = computed<DescriptionFieldGroup[]>(() =>
    this.section().groups.filter((group: DescriptionFieldGroup) => group.isRoot),
  );
  protected readonly itemGroups = computed<DescriptionFieldGroup[]>(() =>
    this.section().groups.filter((group: DescriptionFieldGroup) => !group.isRoot),
  );
  protected readonly effectiveSelectedItemIndex = computed<number>(() => {
    const items = this.itemGroups();
    if (items.length === 0) return 0;
    const raw = this.selectedItemIndex();
    return raw >= 0 && raw < items.length ? raw : 0;
  });

  protected onFieldChange(field: DescriptionField, value: string): void {
    this.fieldChange.emit({ code: field.code, key: field.key, kind: field.kind, value });
  }

  protected selectItem(index: number): void {
    this.itemSelected.emit(index);
  }
}
