import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { IgntIconComponent, type IgntIconName, type IgntIconVariant } from '@ignite/icon';

import type { ResolvedFztTicketSelectorTranslations } from '../../models/ticket-selector-translations.model';
import type { FztTileCategory, FztTileVm } from '../../models/ticket-selector-vm.model';
import { FztTilePriceComponent } from '../tile-price/tile-price.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FztTilePriceComponent, IgntIconComponent],
  selector: 'fzt-tile-bottom',
  styleUrl: './tile-bottom.component.scss',
  templateUrl: './tile-bottom.component.html',
})
export class FztTileBottomComponent {
  readonly #categoryIconNames = new Map<FztTileCategory, IgntIconName>([
    ['addon', 'cart-plus'],
    ['food_and_beverage', 'utensils'],
    ['membership', 'address-card'],
    ['product', 'gift'],
    ['session', 'ticket-alt'],
  ]);

  readonly translations = input.required<ResolvedFztTicketSelectorTranslations>();
  readonly vm = input.required<FztTileVm>();
  readonly isMobile = input(false);

  protected readonly categoryIconName = computed<IgntIconName>(() => {
    const tile = this.vm();

    return tile.category === 'product' && tile.kind === 'parent' ? 'boxes' : (this.#categoryIconNames.get(tile.category) ?? 'ticket-alt');
  });
  protected readonly categoryIconVariant = computed<IgntIconVariant>(() => (this.vm().isMultiDay ? 'solid' : 'light'));
  protected readonly showPrice = computed<boolean>(() => this.vm().priceLabel !== null && this.vm().kind !== 'parent');
  protected readonly showTileIcon = computed<boolean>(() => !this.isMobile() || this.vm().kind === 'parent');
  protected readonly unitsAvailableLabel = computed<string | null>(() => {
    const unitsAvailable = this.vm().unitsAvailable;

    return unitsAvailable === null ? null : `${unitsAvailable} ${this.translations().available}`;
  });
}
