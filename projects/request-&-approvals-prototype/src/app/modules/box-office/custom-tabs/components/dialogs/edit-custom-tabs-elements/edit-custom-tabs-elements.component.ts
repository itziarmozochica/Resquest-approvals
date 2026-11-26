import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { OssCustomTabType, OssCustomTabTypes } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { CenteredDialogComponent } from '@fz-original/app/shared/components/centered-dialog/centered-dialog.component';
import type { Warehouse } from '@fz-shop-products/src/lib/retail/models/retail-setup/warehouse.model';
import { IgntIconComponent } from '@ignite/icon';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';

import {
  DialogEditCustomTabElementsSelectedItem,
  SelectedTilePreviewChild,
  SelectedTileTargetElementType,
  SelectionMode,
  SelectionModes,
} from '../../../models/edit-custom-tabs-elements.model';
import {
  CustomTabTile,
  CustomTabTileLeafCategory,
  CustomTabTileTargetElementType,
  CustomTabTileType,
} from '../../../services/onsite-setup-custom-tabs/onsite-setup-custom-tabs.model';
import {
  HierarchiesResponse,
  HierarchyElement,
  HierarchyProduct,
} from '../../../services/retail-setup-hierarchies/retail-setup-hierarchies.model';
import { RetailSetupHierarchiesService } from '../../../services/retail-setup-hierarchies/retail-setup-hierarchies.service';
import { SelectableItemComponent } from './components/selectable-item/selectable-item.component';
import {
  collectAutoExpandedIds,
  collectExpandedIdsFromSearch,
  collectVisibleItemIds,
  filterElementsBySearchTerm,
  TILE_CONVERTERS,
} from './edit-custom-tabs-elements.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CenteredDialogComponent, FormsModule, IgntIconComponent, IgntInputFieldComponent, SelectableItemComponent, TranslateModule],
  selector: 'app-dialog-edit-custom-tabs-elements',
  standalone: true,
  styleUrls: ['./edit-custom-tabs-elements.component.scss'],
  templateUrl: './edit-custom-tabs-elements.component.html',
})
export class DialogEditCustomTabElementsComponent {
  readonly #hierarchiesService = inject(RetailSetupHierarchiesService);

  readonly expandedIds = signal<Set<string>>(new Set());
  readonly hierarchiesResponse = signal<HierarchiesResponse | null>(null);
  readonly hierarchyElements = computed<HierarchyElement[]>(() => {
    const response = this.hierarchiesResponse();
    if (!response?.hierarchies?.length) return [];

    return response.hierarchies.flatMap(hierarchy => hierarchy.rootElements);
  });
  readonly searchTerm = signal<string>('');
  readonly filteredHierarchyElements = computed<HierarchyElement[]>(() =>
    filterElementsBySearchTerm(this.hierarchyElements(), this.searchTerm()),
  );
  readonly tabType = input.required<OssCustomTabTypes | null>();
  readonly isSpecificItemsType = computed(() => this.tabType() === OssCustomTabType.specific_items);
  readonly alternateBackgroundIds = computed<Set<string>>(() => {
    const visibleIds = collectVisibleItemIds(this.filteredHierarchyElements(), this.expandedIds(), this.isSpecificItemsType());
    return new Set(visibleIds.filter((_, index) => index % 2 === 1));
  });
  readonly autoExpandedIds = computed<Set<string>>(() => collectAutoExpandedIds(this.hierarchyElements()));
  readonly closed = output<void>();
  readonly expandedIdsFromSearch = computed<Set<string>>(() => collectExpandedIdsFromSearch(this.hierarchyElements(), this.searchTerm()));
  readonly initialExpandedIds = computed<Set<string>>(() => {
    const searchExpanded = this.expandedIdsFromSearch();
    const autoExpanded = this.autoExpandedIds();
    return new Set([...searchExpanded, ...autoExpanded]);
  });
  readonly initialSelectedTileIds = signal<string[]>([]);
  readonly initialTiles = input<CustomTabTile[]>([]);
  readonly selectedTiles = signal<DialogEditCustomTabElementsSelectedItem[]>([]);
  readonly newlySelectedTilesCount = computed(() => {
    const initialIds = new Set(this.initialSelectedTileIds());
    return this.selectedTiles().filter(tile => !initialIds.has(this.#getTileUniqueId(tile))).length;
  });
  readonly isActionButtonDisabled = computed(() => {
    const selectedCount = this.newlySelectedTilesCount();
    if (this.isHierarchyType()) {
      return selectedCount !== 1;
    }

    return selectedCount < 1;
  });
  readonly isHierarchyType = computed(() => this.tabType() === OssCustomTabType.parent_hierarchy_element);
  readonly isLoading = signal<boolean>(false);
  readonly isVisible = input.required<boolean>();
  readonly partnerId = input.required<number>();
  readonly retailSetupId = input.required<string>();
  readonly selectedTileIds = computed(() => this.selectedTiles().map(tile => this.#getTileUniqueId(tile)));
  readonly selectionMode = computed<SelectionModes>(() => (this.isHierarchyType() ? SelectionMode.SINGLE : SelectionMode.MULTIPLE));
  readonly submitLabelKey = computed(() => {
    if (this.isHierarchyType()) {
      return 'boxOffice.customTabs.dialogs.editCustomTabTiles.hierarchy.actionButton';
    }
    const suffix = this.newlySelectedTilesCount() > 1 ? 'Plural' : 'Singular';
    return `boxOffice.customTabs.dialogs.editCustomTabTiles.specificItems.actionButton${suffix}`;
  });
  readonly submitted = output<{ tiles: DialogEditCustomTabElementsSelectedItem[] }>();
  readonly warehouse = input.required<Warehouse>();

  constructor() {
    effect(() => {
      if (this.isVisible()) {
        this.#initializeSelectedTiles();
        this.#loadHierarchies();
      }
    });

    effect(() => {
      this.expandedIds.set(new Set(this.initialExpandedIds()));
    });
  }

  dismiss(): void {
    this.selectedTiles.set([]);
    this.initialSelectedTileIds.set([]);
    this.searchTerm.set('');
    this.hierarchiesResponse.set(null);
    this.closed.emit();
  }

  onExpandedChange(event: { expanded: boolean; id: string }): void {
    this.expandedIds.update(ids => {
      const newIds = new Set(ids);
      if (event.expanded) {
        newIds.add(event.id);
      } else {
        newIds.delete(event.id);
      }
      return newIds;
    });
  }

  onProductSelect(product: HierarchyProduct): void {
    const alreadySelected = this.selectedTiles().some(
      t => t.target_element_type === CustomTabTileTargetElementType.PRODUCT && t.target_element_info.product_id === product.id,
    );
    if (alreadySelected) {
      this.selectedTiles.update(tiles =>
        tiles.filter(
          t => !(t.target_element_type === CustomTabTileTargetElementType.PRODUCT && t.target_element_info.product_id === product.id),
        ),
      );
    } else {
      const selectedTile = this.#createSelectedTileFromProduct(product);
      this.selectedTiles.update(tiles => [...tiles, selectedTile]);
    }
  }

  onSearchTermChange(value: string): void {
    this.searchTerm.set(value);
  }

  onTileDeselect(tileId: string): void {
    this.selectedTiles.update(tiles => tiles.filter(t => this.#getTileUniqueId(t) !== tileId));
  }

  onTileSelect(element: HierarchyElement): void {
    const selectedTile = this.#createSelectedTileFromElement(element);

    if (this.isHierarchyType()) {
      this.selectedTiles.set([selectedTile]);
    } else {
      const alreadySelected = this.selectedTiles().some(
        t => this.#isHierarchyElementTile(t) && t.target_element_info.hierarchy_element_id === element.id,
      );
      if (!alreadySelected) {
        this.selectedTiles.update(tiles => [...tiles, selectedTile]);
      }
    }
  }

  submit(): void {
    if (this.isActionButtonDisabled()) return;

    this.submitted.emit({ tiles: this.selectedTiles() });
    this.dismiss();
  }

  #buildPreviewChildren(element: HierarchyElement): SelectedTilePreviewChild[] {
    const children: SelectedTilePreviewChild[] = [];

    for (const childElement of element.hierarchyElements) {
      children.push({
        leafCategory: null,
        name: childElement.name,
        tileType:
          childElement.hierarchyElements.length > 0 || childElement.products.length > 0 ? CustomTabTileType.PARENT : CustomTabTileType.LEAF,
      });
    }

    for (const product of element.products) {
      children.push({
        leafCategory: CustomTabTileLeafCategory.PRODUCT,
        name: product.name,
        tileType: CustomTabTileType.LEAF,
      });
    }

    return children;
  }

  #convertToSelectedTile(tile: CustomTabTile): DialogEditCustomTabElementsSelectedItem | null {
    return TILE_CONVERTERS[tile.targetElementType]?.(tile) ?? null;
  }

  #createSelectedTileFromElement(element: HierarchyElement): DialogEditCustomTabElementsSelectedItem {
    const isParentHierarchy = this.isHierarchyType();

    return {
      children: isParentHierarchy ? this.#buildPreviewChildren(element) : undefined,
      name: element.name,
      target_element_info: {
        hierarchy_element_id: element.id,
      },
      target_element_type: isParentHierarchy
        ? CustomTabTileTargetElementType.PARENT_HIERARCHY_ELEMENT
        : CustomTabTileTargetElementType.HIERARCHY_ELEMENT,
    };
  }

  #createSelectedTileFromProduct(product: HierarchyProduct): DialogEditCustomTabElementsSelectedItem {
    return {
      name: product.name,
      target_element_info: {
        product_id: product.id,
      },
      target_element_type: CustomTabTileTargetElementType.PRODUCT,
    };
  }

  #getTileUniqueId(tile: DialogEditCustomTabElementsSelectedItem): string {
    const TILE_ID_EXTRACTORS: Record<
      SelectedTileTargetElementType,
      (info: DialogEditCustomTabElementsSelectedItem['target_element_info']) => string
    > = {
      [CustomTabTileTargetElementType.PRODUCT]: info => (info as { product_id: string }).product_id,
      [CustomTabTileTargetElementType.HIERARCHY]: info => (info as { hierarchy_id: string }).hierarchy_id,
      [CustomTabTileTargetElementType.HIERARCHY_ELEMENT]: info => (info as { hierarchy_element_id: string }).hierarchy_element_id,
      [CustomTabTileTargetElementType.PARENT_HIERARCHY_ELEMENT]: info => (info as { hierarchy_element_id: string }).hierarchy_element_id,
    };
    return TILE_ID_EXTRACTORS[tile.target_element_type](tile.target_element_info);
  }

  #initializeSelectedTiles(): void {
    const initialTiles = this.initialTiles();
    if (!initialTiles.length) return;

    const selectedTiles = initialTiles
      .map(tile => this.#convertToSelectedTile(tile))
      .filter((tile): tile is DialogEditCustomTabElementsSelectedItem => tile !== null);

    this.selectedTiles.set(selectedTiles);
    this.initialSelectedTileIds.set(selectedTiles.map(tile => this.#getTileUniqueId(tile)));
  }

  #isHierarchyElementTile(tile: DialogEditCustomTabElementsSelectedItem): tile is DialogEditCustomTabElementsSelectedItem & {
    target_element_info: { hierarchy_element_id: string };
  } {
    return (
      tile.target_element_type === CustomTabTileTargetElementType.HIERARCHY_ELEMENT ||
      tile.target_element_type === CustomTabTileTargetElementType.PARENT_HIERARCHY_ELEMENT
    );
  }

  #loadHierarchies(): void {
    const partnerId = this.partnerId();
    const retailSetupId = this.retailSetupId();
    if (!partnerId || !retailSetupId) return;

    this.isLoading.set(true);
    this.#hierarchiesService
      .getHierarchies({
        partnerId,
        retailSetupId,
        warehouseId: this.warehouse()?.id,
      })
      .subscribe(response => {
        this.isLoading.set(false);
        if (response.data) {
          this.hierarchiesResponse.set(response.data);
        }
      });
  }
}
