import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import {
  IgntAccordionBodyDirective,
  IgntAccordionComponent,
  IgntAccordionItemComponent,
  IgntButtonComponent,
  IgntMenuComponent,
  IgntMenuItemComponent,
  IgntMenuTriggerForDirective,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';

import type { FieldInput } from '../../utils/immersive-layout-field-edit.util';
import type { ArrayGroupRowView, ArrayGroupView, ModuleFieldView } from '../../utils/immersive-layout-field-view.util';
import { ImmersiveFieldComponent } from '../immersive-field/immersive-field.component';

export interface ArrayGroupItemDropped {
  event: CdkDragDrop<unknown>;
  group: ArrayGroupView;
}

export interface ArrayGroupItemRemoved {
  group: ArrayGroupView;
  itemIndex: number;
}

export interface ArrayGroupValueChange {
  input: FieldInput;
  view: ModuleFieldView;
}

// One nested level of child array groups (e.g. a lineup item's own subitems) renders by nesting
// this same component inside its own row — see the template's recursive `@for (childGroup of
// row.childGroups)`. Angular resolves that self-reference from the element's own selector, so this
// component never needs to list itself in its own `imports`. Every event a row or a nested instance
// raises carries its own origin `group`/`view`, so an intermediate level only ever re-emits what a
// deeper instance already resolved, never re-deriving it.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.immersive-array-group--nested]': 'nested()' },
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    IgntAccordionBodyDirective,
    IgntAccordionComponent,
    IgntAccordionItemComponent,
    IgntButtonComponent,
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntMenuComponent,
    IgntMenuItemComponent,
    IgntMenuTriggerForDirective,
    IgntTagComponent,
    ImmersiveFieldComponent,
    TranslateModule,
  ],
  selector: 'app-immersive-array-group',
  styleUrl: './immersive-array-group.component.scss',
  templateUrl: './immersive-array-group.component.html',
})
export class ImmersiveArrayGroupComponent {
  readonly group = input.required<ArrayGroupView>();
  // Set by a parent instance of this very component when it renders one of its OWN rows'
  // `childGroups`; a top-level instance (rendered by `ImmersiveModuleContentComponent`) leaves it at
  // the default. Drives the host's nested-indentation class — see the component's own scss — instead
  // of a `:host ::ng-deep` reach-down from a shared ancestor stylesheet.
  readonly nested = input(false);

  readonly addItem = output<ArrayGroupView>();
  readonly itemDropped = output<ArrayGroupItemDropped>();
  readonly openMediaPreview = output<ModuleFieldView>();
  readonly openTranslations = output<ModuleFieldView>();
  readonly removeItem = output<ArrayGroupItemRemoved>();
  readonly valueChange = output<ArrayGroupValueChange>();

  protected onAddItem(): void {
    this.addItem.emit(this.group());
  }

  protected onItemDropped(event: CdkDragDrop<unknown>): void {
    this.itemDropped.emit({ event, group: this.group() });
  }

  protected onRemoveItem(row: ArrayGroupRowView): void {
    this.removeItem.emit({ group: this.group(), itemIndex: row.index });
  }
}
