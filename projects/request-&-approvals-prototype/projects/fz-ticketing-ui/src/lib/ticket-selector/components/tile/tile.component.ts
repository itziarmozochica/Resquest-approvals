import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';

import { FztTapWaveDirective } from '../../directives/tap-wave.directive';
import type { ResolvedFztTicketSelectorTranslations } from '../../models/ticket-selector-translations.model';
import type { FztTileVm } from '../../models/ticket-selector-vm.model';
import { FztMultiDayRangePipe } from '../../pipes/multi-day-range.pipe';
import { FztTileBottomComponent } from '../tile-bottom/tile-bottom.component';

interface FztTileStatusTag {
  readonly label: string;
  readonly testId: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.style]': 'hostStyle()',
  },
  imports: [FztMultiDayRangePipe, FztTapWaveDirective, FztTileBottomComponent, IgntIconComponent, IgntTagComponent],
  selector: 'fzt-tile',
  styleUrl: './tile.component.scss',
  templateUrl: './tile.component.html',
})
export class FztTileComponent {
  readonly translations = input.required<ResolvedFztTicketSelectorTranslations>();
  readonly vm = input.required<FztTileVm>();
  readonly isMobile = input(false);
  readonly add = output<FztTileVm>();

  protected readonly hostStyle = computed<string | null>(() => {
    const customColor = this.vm().customColor;

    return customColor !== null && customColor.length > 0 ? `--color-bar-custom: ${customColor};` : null;
  });
  protected readonly displayName = computed<string>(() => {
    const tile = this.vm();

    return tile.name.length === 0 && tile.kind === 'leaf' && tile.sessionId === null ? this.translations().unavailable : tile.name;
  });
  protected readonly isDisabled = computed<boolean>(() => this.vm().isOutOfStock || this.vm().isUnavailable);
  protected readonly showStatusRow = computed<boolean>(() => this.isDisabled() && this.vm().kind !== 'parent');
  protected readonly statusTags = computed<readonly FztTileStatusTag[]>(() => {
    const tile = this.vm();
    const translations = this.translations();
    const tags: FztTileStatusTag[] = [];

    if (this.showStatusRow()) {
      const parts = [tile.isUnavailable ? translations.unavailable : '', tile.isOutOfStock ? translations.outOfStock : ''];

      tags.push({ label: parts.filter(part => part.length > 0).join(' '), testId: 'item-tile-status' });
    }

    return tags;
  });

  protected addUnit(): void {
    if (this.isDisabled()) {
      return;
    }

    this.add.emit(this.vm());
  }
}
