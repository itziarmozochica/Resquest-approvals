import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { SelectionMode, SelectionModes } from '@fz-original/app/modules/box-office/custom-tabs/models/edit-custom-tabs-elements.model';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntDividerComponent } from '@ignite/legacy/components/ignt-divider/ignt-divider.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { RadioInputChange } from '@ignite/legacy/components/ignt-radio/types/radio-input-change.type';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { HierarchyElement, HierarchyProduct } from '../../../../../services/retail-setup-hierarchies';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FontAwesomeModule, IgntCheckboxComponent, IgntDividerComponent, IgntRadioComponent, TranslateModule],
  selector: 'app-selectable-item',
  standalone: true,
  styleUrls: ['./selectable-item.component.scss'],
  templateUrl: './selectable-item.component.html',
})
export class SelectableItemComponent {
  readonly #translate = inject(TranslateService);

  readonly alternateBackgroundIds = input<Set<string>>(new Set());
  readonly item = input.required<HierarchyElement>();
  readonly countInfoText = computed(() => {
    const item = this.item();
    const subcategories = item.hierarchyElements.length;
    const products = item.products.length;

    if (this.isSingleSelection()) {
      const parts: string[] = [];
      if (subcategories > 0) {
        parts.push(
          this.#translate.instant('boxOffice.customTabs.dialogs.editCustomTabTiles.hierarchy.countInfoSubcategories', { subcategories }),
        );
      }
      if (products > 0) {
        parts.push(this.#translate.instant('boxOffice.customTabs.dialogs.editCustomTabTiles.hierarchy.countInfoProducts', { products }));
      }
      return parts.join(' - ');
    }

    if (this.showProducts()) {
      return this.#translate.instant('boxOffice.customTabs.dialogs.editCustomTabTiles.specificItems.countInfo', {
        count: subcategories + products,
      });
    }

    return '';
  });
  readonly deselected = output<string>();
  readonly disabledIds = input<string[]>([]);
  readonly expandedChange = output<{ expanded: boolean; id: string }>();
  readonly expandedIds = input<Set<string>>(new Set());
  readonly hasAlternateBackground = computed(() => this.alternateBackgroundIds().has(this.item().id));
  readonly hasProductAlternateBackground = (productId: string): boolean => this.alternateBackgroundIds().has(productId);
  readonly initialExpandedIds = input<Set<string>>(new Set());
  readonly isDisabled = computed(() => this.disabledIds().includes(this.item().id));
  readonly isExpanded = computed(() => this.expandedIds().has(this.item().id));
  readonly isProductDisabled = (productId: string): boolean => this.disabledIds().includes(productId);
  readonly selectionMode = input<SelectionModes>(SelectionMode.MULTIPLE);
  readonly isSingleSelection = computed(() => this.selectionMode() === SelectionMode.SINGLE);
  readonly level = input<number>(1);
  readonly productSelected = output<HierarchyProduct>();
  readonly selected = output<HierarchyElement>();
  readonly selectedIds = input<string[]>([]);
  readonly showProducts = computed(() => this.selectionMode() === SelectionMode.MULTIPLE);

  onCheckboxChange(checked: boolean): void {
    if (checked) {
      this.selected.emit(this.item());
    } else {
      this.deselected.emit(this.item().id);
    }
  }

  onProductTileSelect(product: HierarchyProduct, checked: boolean): void {
    if (checked) {
      this.productSelected.emit(product);
    } else {
      this.deselected.emit(product.id);
    }
  }

  onRadioChange(event: RadioInputChange): void {
    if (event?.source?.checked) {
      this.selected.emit(this.item());
    }
  }

  onToggleExpand(): void {
    const newExpandedState = !this.isExpanded();
    this.expandedChange.emit({ expanded: newExpandedState, id: this.item().id });
  }
}
