import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';

import type { ResolvedFztTicketSelectorTranslations } from '../../models/ticket-selector-translations.model';
import type { FztTileVm } from '../../models/ticket-selector-vm.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntTagComponent],
  selector: 'fzt-tile-price',
  styleUrl: './tile-price.component.scss',
  templateUrl: './tile-price.component.html',
})
export class FztTilePriceComponent {
  readonly translations = input.required<ResolvedFztTicketSelectorTranslations>();
  readonly vm = input.required<FztTileVm>();
}
