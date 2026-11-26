import { ChangeDetectionStrategy, Component, computed, input, output, ViewEncapsulation } from '@angular/core';

import { IgntColorPickerComponent } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { EMPTY_TEXT_DEFAULTS } from '../_shared/block-text-defaults';
import { ExpandableRichTextEditorComponent } from '../../components/expandable-rich-text-editor/expandable-rich-text-editor.component';
import { LocalImageUploadComponent } from '../../components/local-image-upload/local-image-upload.component';
import { PropLabelComponent } from '../../components/prop-label/prop-label.component';
import { BlockOf, TabItem, TabsProps } from '../../models/block.model';
import { isContractFieldMissing } from '../block-validation.util';
import { TABS_BAR_COLOR_DEFAULT_HEX, TABS_BAR_COLOR_PRESETS, TABS_MAX } from './tabs.constants';
import { TABS_FIELDS } from './tabs.field-contract';
import { createDefaultTab } from './tabs.helpers';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    IgntButtonComponent,
    IgntColorPickerComponent,
    TranslateModule,
    ExpandableRichTextEditorComponent,
    LocalImageUploadComponent,
    PropLabelComponent,
  ],
  selector: 'app-db-tabs-properties',
  standalone: true,
  styleUrl: './tabs-properties.component.scss',
  templateUrl: './tabs-properties.component.html',
})
export class TabsPropertiesComponent {
  readonly block = input.required<BlockOf<'tabs'>>();
  readonly uploadImageCallback = input.required<(file: File) => Observable<string>>();
  readonly disabled = input<boolean>(false);
  readonly highlightMissingMandatory = input<boolean>(false);
  readonly propsChange = output<TabsProps>();

  readonly TABS_BAR_COLOR_PRESETS = TABS_BAR_COLOR_PRESETS;
  readonly TABS_BAR_COLOR_DEFAULT_HEX = TABS_BAR_COLOR_DEFAULT_HEX;
  readonly TABS_MAX = TABS_MAX;
  readonly FIELDS = TABS_FIELDS;

  /**
   * Computed off the block's own `activeIndex` so the panel always mirrors the
   * source of truth — when the user changes tabs from the canvas preview (via
   * the tabs canvas `setActiveTab`) the property fields under "Tab content"
   * rerun `currentTabItem()` and re-render automatically without needing a
   * manual sync. `selectTabAt()` only has to emit the new index; the
   * round-trip through the parent's `blocks` signal drives this value back.
   */
  readonly activeTabIndex = computed<number>(() => {
    // Clamp to the tab list (matching the canvas) so a stale/out-of-range
    // activeIndex can't desync the panel from the preview or make updateTab /
    // removeTab target a non-existent row.
    const { tabs, activeIndex } = this.block().props;
    return Math.min(Math.max(0, activeIndex ?? 0), Math.max(0, tabs.length - 1));
  });

  tabItems(): TabItem[] {
    return this.block().props.tabs;
  }

  currentTabItem(): TabItem | null {
    const tabs = this.tabItems();
    return tabs[this.activeTabIndex()] ?? tabs[0] ?? null;
  }

  /** Missing-state of the displayed tab's field (tabs are edited one at a time). */
  isMissing(field: string): boolean {
    if (!this.highlightMissingMandatory()) return false;
    const tab = this.currentTabItem();
    return tab !== null && isContractFieldMissing(TABS_FIELDS, tab, field);
  }

  updateTab(patch: Partial<TabItem>): void {
    const next = this.tabItems().map((t, j) => (j === this.activeTabIndex() ? { ...t, ...patch } : t));
    this.#setMany({ tabs: next });
  }

  selectTabAt(index: number): void {
    // `activeTabIndex` is computed off `block().props.activeIndex` — emitting
    // the new index to the parent is enough; the computed picks up the change
    // on the next signal flush.
    this.#setMany({ activeIndex: index });
  }

  addTab(): void {
    const tabs = this.tabItems();
    if (tabs.length >= TABS_MAX) return;
    const next = [...tabs, createDefaultTab(tabs.length, EMPTY_TEXT_DEFAULTS)];
    const newIndex = next.length - 1;
    this.#setMany({ tabs: next, activeIndex: newIndex });
  }

  removeTab(): void {
    const tabs = this.tabItems();
    if (tabs.length <= 1) return;
    const next = tabs.filter((_, j) => j !== this.activeTabIndex());
    const newIndex = Math.max(0, Math.min(this.activeTabIndex(), next.length - 1));
    this.#setMany({ tabs: next, activeIndex: newIndex });
  }

  tabBarColor(): string {
    return this.block().props.tabBarColor ?? '';
  }

  setTabBarColor(value: string): void {
    this.#setMany({ tabBarColor: value });
  }

  /** Emit a multi-key patch atomically. Use when a single user action changes
   *  more than one prop (e.g. add tab → updates both `tabs` and `activeIndex`). */
  #setMany(patch: Partial<TabsProps>): void {
    this.propsChange.emit({ ...this.block().props, ...patch });
  }
}
