import { ChangeDetectionStrategy, Component, inject, input, output, ViewEncapsulation } from '@angular/core';

import { isHtmlMeaningful } from '@fz-original/app/modules/content-plan/utils/default-translation-field-catalog';
import { TranslateService } from '@ngx-translate/core';

import { resolvePlaceholder } from '../_shared/placeholder.util';
import { SHARED_BLOCK_I18N } from '../_shared/shared.i18n-keys';
import { BlockOf, BlockProps, TabItem } from '../../models/block.model';
import { TABS_I18N } from './tabs.i18n-keys';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  selector: 'app-db-tabs-canvas',
  standalone: true,
  styleUrl: './tabs-canvas.component.scss',
  templateUrl: './tabs-canvas.component.html',
})
export class TabsCanvasComponent {
  readonly block = input.required<BlockOf<'tabs'>>();
  /** Editor-only: muted hints over empty text props. MUST stay `false` for export. */
  readonly showPlaceholders = input<boolean>(false);
  /** The only canvas with edition state: clicking a pill moves `activeIndex`. */
  readonly propsChange = output<BlockProps>();

  readonly KEYS = TABS_I18N;
  readonly SHARED_KEYS = SHARED_BLOCK_I18N;

  readonly #translate = inject(TranslateService, { optional: true });

  placeholderFor(key: string, params?: Record<string, unknown>): string {
    return resolvePlaceholder(this.#translate, this.showPlaceholders(), key, params);
  }

  /** Rich-text props: empty editors can leave markup like `<p></p>` behind. */
  hasRichText(html: string): boolean {
    return isHtmlMeaningful(html);
  }

  activeTabIndex(): number {
    const { tabs, activeIndex } = this.block().props;
    if (tabs.length === 0) return 0;
    return Math.min(Math.max(0, activeIndex ?? 0), tabs.length - 1);
  }

  activeTab(): TabItem | null {
    const { tabs } = this.block().props;
    if (tabs.length === 0) return null;
    return tabs[this.activeTabIndex()] ?? null;
  }

  tabsBarColor(): string {
    const { tabBarColor } = this.block().props;
    return /^#[0-9A-Fa-f]{6}$/.test(tabBarColor.trim()) ? tabBarColor.trim() : '';
  }

  setActiveTab(index: number, event: MouseEvent): void {
    event.stopPropagation();
    const block = this.block();
    if (index === block.props.activeIndex) return;
    this.propsChange.emit({ ...block.props, activeIndex: index });
  }
}
