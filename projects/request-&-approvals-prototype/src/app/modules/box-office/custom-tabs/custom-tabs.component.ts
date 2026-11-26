import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnDestroy, Signal, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { ConfirmationDialogComponent } from '@fz-original/app/memberships/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogService } from '@fz-original/app/memberships/services/confirmation-dialog/confirmation-dialog.service';
import { TOGGLE_FOOTER_EVENT_KEY } from '@fz-original/app/shared/layout/footer/toggle-footer-event-key';
import { SubsectionItem } from '@fz-original/app/shared/layout/page-title/page-title.component';
import { PageTitleModule } from '@fz-original/app/shared/layout/page-title/page-title.module';
import { DeviceType } from '@fz-original/app/shared/models/device/device.model';
import { WithUnsavedChangesGuardComponent } from '@fz-original/app/shared/models/with-unsaved-changes-guard-component.model';
import { DeviceService } from '@fz-original/app/shared/services/device/device.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import type { Warehouse } from '@fz-shop-products/src/lib/retail/models/retail-setup/warehouse.model';
import { IgntAlertComponent, IgntButtonComponent, type IgntButtonIcon } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { OssCustomTabType } from '../shared/models/onsite-setup';
import { CustomTabsActionsComponent } from './components/custom-tabs-actions/custom-tabs-actions.component';
import { CustomTabsTilesGridComponent } from './components/custom-tabs-tiles-grid/custom-tabs-tiles-grid.component';
import { DialogEditCustomTabInfoComponent } from './components/dialogs/edit-custom-tab-info/edit-custom-tab-info.component';
import { DialogEditCustomTabElementsComponent } from './components/dialogs/edit-custom-tabs-elements/edit-custom-tabs-elements.component';
import { DialogEditCustomTabsOrderComponent } from './components/dialogs/edit-custom-tabs-order/edit-custom-tabs-order.component';
import { DialogEditTileAppearanceComponent } from './components/dialogs/edit-tile-appearance/edit-tile-appearance.component';
import { CustomTabsResolverData } from './custom-tabs.resolver';
import { parseIconString } from './custom-tabs.util';
import { CustomTabsActionsConfig, CustomTabsActionType, CustomTabsActionTypes, DEFAULT_ICON_PREFIX } from './models/custom-tabs.model';
import { CustomTileColorKeys } from './models/custom-tile.model';
import { DialogEditCustomFormValues, DialogEditCustomTabMode, DialogEditCustomTabModes } from './models/edit-custom-tab-info.model';
import { DialogEditCustomTabElementsSelectedItem, DialogEditCustomTabElementsState } from './models/edit-custom-tabs-elements.model';
import { DialogEditTileAppearanceFormValues, DialogEditTileAppearanceState } from './models/edit-tile-appearance.model';
import {
  CustomTab,
  CustomTabTile,
  CustomTabTilePrevisualizationData,
  CustomTabTileTargetElementInfo,
  CustomTabTileTargetElementType,
  CustomTabTileType,
} from './services/onsite-setup-custom-tabs/onsite-setup-custom-tabs.model';
import { OnsiteSetupCustomTabsService } from './services/onsite-setup-custom-tabs/onsite-setup-custom-tabs.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ConfirmationDialogComponent,
    CustomTabsActionsComponent,
    CustomTabsTilesGridComponent,
    DialogEditCustomTabInfoComponent,
    DialogEditCustomTabElementsComponent,
    DialogEditCustomTabsOrderComponent,
    DialogEditTileAppearanceComponent,
    IgntIconComponent,
    IgntTabsComponent,
    IgntTabsItemComponent,
    PageTitleModule,
    TranslateModule,
    IgntButtonComponent,
    IgntAlertComponent,
  ],
  selector: 'app-box-office-custom-tabs',
  standalone: true,
  styleUrls: ['./custom-tabs.component.scss'],
  templateUrl: './custom-tabs.component.html',
})
export class BoxOfficeCustomTabsComponent implements OnDestroy, WithUnsavedChangesGuardComponent {
  readonly #customTabsService = inject(OnsiteSetupCustomTabsService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #deviceService = inject(DeviceService);
  readonly #dialogService = inject(ConfirmationDialogService);
  #originalCustomTabs: CustomTab[] = [];
  #redirectQueryParams: { cityId?: string; venueId?: string } = {};
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);

  protected readonly orderTabsIcon: IgntButtonIcon = { name: 'sort', variant: 'light' };
  activeTabIndex: WritableSignal<number> = signal<number>(0);
  onsiteSetupId: WritableSignal<string | null> = signal<string | null>(this.#route.snapshot.paramMap.get('onsiteSetupId'));
  boxOfficeLink: Signal<string> = computed(() => {
    const currentQueryParams = this.#route.snapshot.queryParams;
    const urlTree = this.#router.createUrlTree(['/box-office'], {
      queryParams: { ...currentQueryParams, onsiteSetupId: this.onsiteSetupId() },
    });
    return this.#router.serializeUrl(urlTree);
  });
  boxOfficeLinkTarget: WritableSignal<string> = signal<string>(
    this.#deviceService.getDeviceType() === DeviceType.DualScreen ? '_self' : '_blank',
  );
  customTabs: WritableSignal<CustomTab[]> = signal<CustomTab[]>([]);
  selectedCustomTab: Signal<CustomTab | null> = computed(() => this.customTabs()[this.activeTabIndex()] ?? null);
  customTabsActionsConfig: Signal<CustomTabsActionsConfig> = computed(() => {
    const selectedTab = this.selectedCustomTab();
    const isHierarchyType = selectedTab?.type === OssCustomTabType.parent_hierarchy_element;
    const hasTiles = (selectedTab?.tiles.length ?? 0) > 0;
    return {
      hasTiles: hasTiles,
      isEmpty: !this.customTabs().length,
      actionsTitle: isHierarchyType && hasTiles ? selectedTab?.tiles[0]?.name : null,
      tabIndex: this.activeTabIndex(),
      tabType: selectedTab?.type,
    };
  });
  dialogEditInfoState = signal<{ isVisible: boolean; mode: DialogEditCustomTabModes; tab: CustomTab | null }>({
    isVisible: false,
    mode: DialogEditCustomTabMode.CREATE,
    tab: null,
  });
  dialogEditTabsOrderOpen: WritableSignal<boolean> = signal<boolean>(false);
  dialogEditTileAppearanceState = signal<DialogEditTileAppearanceState>({
    defaultColorKey: 'positive',
    isVisible: false,
    tabIndex: -1,
    tile: null,
    tileIndex: -1,
  });
  dialogEditTilesState = signal<DialogEditCustomTabElementsState>({
    isVisible: false,
    hierarchyElements: [],
    tabType: null,
  });
  partnerId = signal<number | null>(null);
  retailSetupId = signal<string | null>(null);
  shouldBackToOnsiteSetup = signal(false);
  warehouse: WritableSignal<Warehouse | null> = signal<Warehouse | null>(null);
  subsections: Signal<SubsectionItem[]> = computed(() => {
    const { cityId, venueId } = this.#redirectQueryParams;
    const settingsItem = {
      title: this.#translateService.instant('menu.settings'),
      link: `/box-office/settings`,
      queryParams: { cityId, venueId },
    };
    const warehouseItem = {
      title: this.warehouse()?.name ?? '',
      link: `/products/catalog-integrations/${this.retailSetupId()}`,
    };
    return [settingsItem, warehouseItem];
  });
  unsavedChangesModalConfig: WithUnsavedChangesGuardComponent['unsavedChangesModalConfig'] = {
    discardButtonKey: 'boxOffice.customTabs.actions.unsavedChangesConfirm.confirmButton',
    messageKey: 'boxOffice.customTabs.actions.unsavedChangesConfirm.message',
    showDangerAcceptButton: true,
    titleKey: 'boxOffice.customTabs.actions.unsavedChangesConfirm.title',
  };

  constructor() {
    this.#toggleFooter(false);
    this.#initializeFromRoute();
  }

  areChangesUnsaved(): boolean {
    const currentTabs = this.customTabs();
    const originalTabs = this.#originalCustomTabs;

    if (currentTabs.length !== originalTabs.length) {
      return true;
    }

    return currentTabs.some((currentTab, index) => {
      const originalTab = originalTabs[index];
      return (
        currentTab.name !== originalTab.name ||
        currentTab.icon !== originalTab.icon ||
        currentTab.type !== originalTab.type ||
        currentTab.tiles.length !== originalTab.tiles.length
      );
    });
  }

  getIconProp(iconString: string): IconProp {
    return parseIconString(iconString);
  }

  ngOnDestroy(): void {
    this.#toggleFooter(true);
  }

  onActionButtonClick(actionType: CustomTabsActionTypes, tabIndex: number): void {
    const tab = this.customTabs()[tabIndex];
    if (actionType !== CustomTabsActionType.ADD_TAB && !tab) return;

    const actionHandlers: Record<CustomTabsActionTypes, () => void> = {
      [CustomTabsActionType.ADD_CATEGORY]: () => this.#handleAddCategory(tabIndex),
      [CustomTabsActionType.ADD_TAB]: () => this.#handleAddTab(),
      [CustomTabsActionType.ADD_TAB_ITEMS]: () => this.#handleAddTabItems(tabIndex),
      [CustomTabsActionType.DELETE_TAB]: () => this.#handleDeleteTab(tabIndex),
      [CustomTabsActionType.DELETE_TAB_ITEMS]: () => this.#handleDeleteTabItems(tabIndex),
      [CustomTabsActionType.EDIT_CATEGORY]: () => this.#handleEditCategory(tabIndex),
      [CustomTabsActionType.EDIT_TAB_INFO]: () => this.#handleEditTabInfo(tabIndex),
    };
    actionHandlers[actionType]?.();
  }

  onAddNewTabClick(): void {
    this.#handleAddTab();
  }

  onDialogCustomTabInfoSubmit(formValue: DialogEditCustomFormValues): void {
    const { name, icon, tabType: type } = formValue;
    const formattedIcon = `${DEFAULT_ICON_PREFIX}-${icon}`;

    if (this.dialogEditInfoState().mode === DialogEditCustomTabMode.CREATE) {
      const newTab: CustomTab = { icon: formattedIcon, name, type, tiles: [] };
      this.customTabs.update(tabs => [...tabs, newTab]);
      this.activeTabIndex.set(this.customTabs().length - 1);
      this.shouldBackToOnsiteSetup.set(false);
    } else {
      const tabIndex = this.activeTabIndex();
      this.customTabs.update(tabs => tabs.map((tab, index) => (index === tabIndex ? { ...tab, icon: formattedIcon, name, type } : tab)));
    }
  }

  onDialogCustomTabsOrderSubmit(orderedTabs: CustomTab[]): void {
    const currentTab = this.customTabs()[this.activeTabIndex()];
    this.customTabs.set(orderedTabs);
    this.activeTabIndex.set(currentTab?.id ? orderedTabs.findIndex(tab => tab.id === currentTab.id) : 0);
  }

  onDialogCustomTabTilesSubmit(event: { tiles: DialogEditCustomTabElementsSelectedItem[] }): void {
    const tabIndex = this.activeTabIndex();
    const currentTab = this.customTabs()[tabIndex];
    if (!currentTab) return;

    this.customTabs.update(tabs =>
      tabs.map((tab, index) =>
        index === tabIndex
          ? {
              ...tab,
              tiles: event.tiles.map(tile => ({
                customColor: tile.color ?? null,
                customName: tile.custom_name ?? null,
                id: tile.id ?? '',
                name: tile.name,
                previsualizationData: this.#buildPrevisualizationData(tile),
                targetElementInfo: this.#mapTargetElementInfo(tile),
                targetElementType: tile.target_element_type,
              })),
            }
          : tab,
      ),
    );
  }

  onDialogTileAppearanceSubmit(formValue: DialogEditTileAppearanceFormValues): void {
    const { tabIndex, tileIndex } = this.dialogEditTileAppearanceState();
    if (tabIndex < 0 || tileIndex < 0) return;

    this.customTabs.update(tabs =>
      tabs.map((tab, idx) => {
        if (idx !== tabIndex) return tab;
        return {
          ...tab,
          tiles: tab.tiles.map((tile, tIdx) => {
            if (tIdx !== tileIndex) return tile;
            return {
              ...tile,
              customColor: formValue.customColor,
              customName: formValue.customName,
            };
          }),
        };
      }),
    );

    this.onEditTileAppearanceDismiss();
  }

  onEditCustomTabElementsDismiss(): void {
    this.dialogEditTilesState.set({
      isVisible: false,
      hierarchyElements: [],
      tabType: null,
    });
  }

  onEditCustomTabInfoDismiss(): void {
    this.dialogEditInfoState.set({ ...this.dialogEditInfoState(), isVisible: false, tab: null });
    if (this.shouldBackToOnsiteSetup()) {
      this.#router.navigate(['/box-office/settings'], { queryParams: this.#redirectQueryParams });
    } else {
      this.#router.navigate([], {
        queryParams: { ...this.#redirectQueryParams, dialogInfoMode: null, openedDialogInfo: null },
        queryParamsHandling: 'merge',
        relativeTo: this.#route,
      });
    }
  }

  onEditTileAppearanceDismiss(): void {
    this.dialogEditTileAppearanceState.set({
      defaultColorKey: 'positive',
      isVisible: false,
      tabIndex: -1,
      tile: null,
      tileIndex: -1,
    });
  }

  onEmptyTilesGridAction(index: number): void {
    const { type } = this.customTabs()[index];
    if (type === OssCustomTabType.parent_hierarchy_element) {
      this.#handleAddCategory(index);
    } else {
      this.#handleAddTabItems(index);
    }
  }

  onOrderTabsClick(): void {
    this.dialogEditTabsOrderOpen.set(true);
  }

  onPublishClick(): void {
    const partnerId = this.partnerId();
    const onsiteSetupId = this.#route.snapshot.paramMap.get('onsiteSetupId');

    if (!partnerId || !onsiteSetupId) {
      return;
    }

    const customTabsToUpdate = this.customTabs();
    this.#customTabsService
      .updateCustomTabs({ partnerId, onsiteSetupId }, customTabsToUpdate)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(result => {
        if (result.success) {
          this.#originalCustomTabs = customTabsToUpdate;
          this.#toastService.add({
            message: this.#translateService.instant('boxOffice.customTabs.notifications.publishSuccessTabs'),
            sentiment: AlertSentiment.positive,
          });
        } else {
          this.#toastService.add({
            message: this.#translateService.instant('boxOffice.customTabs.notifications.genericError'),
            sentiment: AlertSentiment.danger,
          });
        }
      });
  }

  onTabChange(index: number): void {
    this.activeTabIndex.set(index);
  }

  onTileDeleteFromGrid(tabIndex: number, tileIndex: number): void {
    const currentTab = this.customTabs()[tabIndex];
    if (!currentTab || tileIndex < 0 || tileIndex >= currentTab.tiles.length) return;

    this.customTabs.update(tabs =>
      tabs.map((tab, idx) => {
        if (idx !== tabIndex) return tab;
        return {
          ...tab,
          tiles: tab.tiles.filter((_, i) => i !== tileIndex),
        };
      }),
    );
  }

  onTileEditAppearanceFromGrid(tabIndex: number, tileIndex: number): void {
    const currentTab = this.customTabs()[tabIndex];
    if (!currentTab || tileIndex < 0 || tileIndex >= currentTab.tiles.length) return;

    const tile = currentTab.tiles[tileIndex];
    this.dialogEditTileAppearanceState.set({
      defaultColorKey: this.#getDefaultColorKeyForTile(tile),
      isVisible: true,
      tabIndex,
      tile,
      tileIndex,
    });
  }

  #buildPrevisualizationData(tile: DialogEditCustomTabElementsSelectedItem): CustomTabTilePrevisualizationData | null {
    if (!tile.children?.length) {
      return null;
    }

    return {
      parentHierarchyElementChildren: tile.children.map(child => ({
        leafCategory: child.leafCategory,
        name: child.name,
        tileType: child.tileType,
      })),
      tileType: null,
    };
  }

  #getDefaultColorKeyForTile(tile: CustomTabTile | null): CustomTileColorKeys {
    if (!tile) return 'positive';

    const isParentTile =
      tile.previsualizationData?.tileType === CustomTabTileType.PARENT ||
      (tile.targetElementType !== CustomTabTileTargetElementType.PRODUCT &&
        tile.targetElementType !== CustomTabTileTargetElementType.SESSION_TYPE);

    return isParentTile ? 'accent' : 'positive';
  }

  #handleAddCategory(tabIndex: number): void {
    const currentTab = this.customTabs()[tabIndex];
    if (!currentTab) return;

    this.dialogEditTilesState.set({
      isVisible: true,
      hierarchyElements: [],
      tabType: currentTab.type,
    });
  }

  #handleAddTab(): void {
    this.dialogEditInfoState.set({ isVisible: true, mode: DialogEditCustomTabMode.CREATE, tab: null });
  }

  #handleAddTabItems(tabIndex: number): void {
    const currentTab = this.customTabs()[tabIndex];
    if (!currentTab) return;

    this.dialogEditTilesState.set({
      isVisible: true,
      hierarchyElements: [],
      tabType: currentTab.type,
    });
  }

  #handleDeleteTab(tabIndex: number): void {
    const tabName = this.customTabs()[tabIndex]?.name ?? '';
    this.#dialogService
      .confirm({
        acceptLabel: this.#translateService.instant('boxOffice.customTabs.actions.deleteTabConfirm.title'),
        cancelLabel: this.#translateService.instant('common.cancel'),
        isDanger: true,
        message: this.#translateService.instant('boxOffice.customTabs.actions.deleteTabConfirm.message'),
        title: `${this.#translateService.instant('boxOffice.customTabs.actions.deleteTabConfirm.title')} "${tabName}"`,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;

        this.customTabs.update(tabs => tabs.filter((_, index) => index !== tabIndex));
        const wasLastTab = this.customTabs().length === 0;
        if (!wasLastTab) {
          this.activeTabIndex.set(Math.min(tabIndex, this.customTabs().length - 1));
        }
      });
  }

  #handleDeleteTabItems(tabIndex: number): void {
    this.#dialogService
      .confirm({
        acceptLabel: this.#translateService.instant('boxOffice.customTabs.actions.deleteTabItemsConfirm.title'),
        cancelLabel: this.#translateService.instant('common.cancel'),
        isDanger: true,
        message: this.#translateService.instant('boxOffice.customTabs.actions.deleteTabItemsConfirm.message'),
        title: this.#translateService.instant('boxOffice.customTabs.actions.deleteTabItemsConfirm.title'),
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;

        this.#updateCustomTabData(tabIndex, { ...this.customTabs()[tabIndex], tiles: [] });
      });
  }

  #handleEditCategory(tabIndex: number): void {
    const currentTab = this.customTabs()[tabIndex];
    if (!currentTab) return;

    this.dialogEditTilesState.set({
      isVisible: true,
      hierarchyElements: [],
      tabType: currentTab.type,
    });
  }

  #handleEditTabInfo(tabIndex: number): void {
    this.dialogEditInfoState.set({
      isVisible: true,
      mode: DialogEditCustomTabMode.EDIT,
      tab: this.customTabs()[tabIndex],
    });
  }

  #initializeDialogState(queryParams: Params): void {
    const dialogInfoMode = queryParams['dialogInfoMode'] as DialogEditCustomTabModes | undefined;
    const openedDialogInfo = queryParams['openedDialogInfo'] === 'true';

    if (openedDialogInfo && dialogInfoMode === DialogEditCustomTabMode.CREATE) {
      this.shouldBackToOnsiteSetup.set(true);
    }

    const sanitizedMode = dialogInfoMode ?? DialogEditCustomTabMode.CREATE;
    this.dialogEditInfoState.set({
      isVisible: openedDialogInfo,
      mode: sanitizedMode,
      tab: sanitizedMode === DialogEditCustomTabMode.CREATE ? null : this.selectedCustomTab(),
    });
  }

  #initializeFromRoute(): void {
    const resolverData = this.#route.snapshot.data['customTabs'] as CustomTabsResolverData | null;
    if (resolverData?.customTabs) {
      const tabs = resolverData.customTabs.customTabs;
      this.#originalCustomTabs = tabs;
      this.customTabs.set(tabs);
    }
    if (resolverData?.retailSetupId) {
      this.retailSetupId.set(resolverData.retailSetupId);
    }
    if (resolverData?.warehouse) {
      this.warehouse.set(resolverData.warehouse);
    }
    if (resolverData?.partnerId) {
      this.partnerId.set(resolverData.partnerId);
    }

    const queryParams = this.#route.snapshot.queryParams;
    this.#redirectQueryParams = {
      cityId: queryParams['cityId'] as string | undefined,
      venueId: queryParams['venueId'] as string | undefined,
    };

    this.#initializeDialogState(queryParams);
  }

  #mapTargetElementInfo(tile: DialogEditCustomTabElementsSelectedItem): CustomTabTileTargetElementInfo {
    const baseInfo: CustomTabTileTargetElementInfo = {
      hierarchyElementId: null,
      hierarchyId: null,
      placeId: null,
      planId: null,
      productId: null,
      sessionTypeId: null,
    };

    if ('hierarchy_id' in tile.target_element_info) {
      return { ...baseInfo, hierarchyId: tile.target_element_info.hierarchy_id };
    }
    if ('hierarchy_element_id' in tile.target_element_info) {
      return { ...baseInfo, hierarchyElementId: tile.target_element_info.hierarchy_element_id };
    }
    if ('product_id' in tile.target_element_info) {
      return { ...baseInfo, productId: tile.target_element_info.product_id };
    }

    return baseInfo;
  }

  #toggleFooter(isActive: boolean): void {
    const toggleFooterEvent = new CustomEvent(TOGGLE_FOOTER_EVENT_KEY, { detail: { isActive } });
    window.dispatchEvent(toggleFooterEvent);
  }

  #updateCustomTabData(index: number, newData: CustomTab): void {
    this.customTabs.update(tabs => {
      if (index < 0 || index >= tabs.length) {
        return tabs;
      }
      return tabs.map((tab, i) => (i === index ? newData : tab));
    });
  }
}
