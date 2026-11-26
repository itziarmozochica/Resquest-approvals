import { ChangeDetectionStrategy, Component, effect, input, output, signal, ViewEncapsulation } from '@angular/core';

import { IgntColorPickerComponent } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { EMPTY_TEXT_DEFAULTS } from '../_shared/block-text-defaults';
import { LocalImageUploadComponent } from '../../components/local-image-upload/local-image-upload.component';
import { PropLabelComponent } from '../../components/prop-label/prop-label.component';
import { BlockOf, InfoCard, InfoCardProps } from '../../models/block.model';
import { isContractFieldMissing } from '../block-validation.util';
import { INFO_CARD_ACCENT_DEFAULT_HEX, INFO_CARD_ACCENT_PRESETS, INFO_CARD_MAX } from './info-card.constants';
import { INFO_CARD_FIELDS } from './info-card.field-contract';
import { createDefaultInfoCard } from './info-card.helpers';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [IgntButtonComponent, IgntColorPickerComponent, TranslateModule, LocalImageUploadComponent, PropLabelComponent],
  selector: 'app-db-info-card-properties',
  standalone: true,
  styleUrl: './info-card-properties.component.scss',
  templateUrl: './info-card-properties.component.html',
})
export class InfoCardPropertiesComponent {
  readonly block = input.required<BlockOf<'infoCard'>>();
  readonly uploadImageCallback = input.required<(file: File) => Observable<string>>();
  readonly disabled = input<boolean>(false);
  readonly highlightMissingMandatory = input<boolean>(false);
  readonly propsChange = output<InfoCardProps>();

  readonly INFO_CARD_ACCENT_PRESETS = INFO_CARD_ACCENT_PRESETS;
  readonly INFO_CARD_ACCENT_DEFAULT_HEX = INFO_CARD_ACCENT_DEFAULT_HEX;
  readonly INFO_CARD_MAX = INFO_CARD_MAX;
  readonly FIELDS = INFO_CARD_FIELDS;

  readonly infoCardTab = signal(0);

  /** Last seen `block().id` — compared in the effect so prop-only parent updates
   *  (new object reference, same id) do not reset the local card cursor. */
  #lastBlockId: string | undefined;

  constructor() {
    // Reset the card cursor only when the edited block identity changes.
    // The parent emits a new block object on every propsChange round-trip;
    // tracking `block()` alone would snap the user back to card 0 on every
    // keystroke.
    effect(() => {
      const blockId = this.block().id;
      if (blockId === this.#lastBlockId) return;
      this.#lastBlockId = blockId;
      this.infoCardTab.set(0);
    });
  }

  infoCards(): InfoCard[] {
    return this.block().props.cards;
  }

  currentCard(): InfoCard {
    const cards = this.infoCards();
    return cards[this.infoCardTab()] ?? cards[0] ?? createDefaultInfoCard(EMPTY_TEXT_DEFAULTS);
  }

  updateCard(patch: Partial<InfoCard>): void {
    const next = this.infoCards().map((c, j) => (j === this.infoCardTab() ? { ...c, ...patch } : c));
    this.#setCards(next);
  }

  addInfoCard(): void {
    const cards = this.infoCards();
    if (cards.length >= INFO_CARD_MAX) return;
    const next = [...cards, createDefaultInfoCard(EMPTY_TEXT_DEFAULTS)];
    this.#setCards(next);
    this.infoCardTab.set(next.length - 1);
  }

  removeInfoCard(): void {
    const cards = this.infoCards();
    if (cards.length <= 1) return;
    const next = cards.filter((_, j) => j !== this.infoCardTab());
    this.#setCards(next);
    this.infoCardTab.set(Math.max(0, Math.min(this.infoCardTab(), next.length - 1)));
  }

  /** Missing-state of the displayed card's field (cards are edited one at a time). */
  isMissing(field: string): boolean {
    return this.highlightMissingMandatory() && isContractFieldMissing(INFO_CARD_FIELDS, this.currentCard(), field);
  }

  #setCards(cards: InfoCard[]): void {
    this.propsChange.emit({ ...this.block().props, cards });
  }
}
