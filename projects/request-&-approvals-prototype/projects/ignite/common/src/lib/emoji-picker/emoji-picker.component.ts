import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, output } from '@angular/core';

import type { EmojiClickEvent } from 'emoji-picker-element/shared';

import { loadEmojiPickerElement } from './utils/load-emoji-picker-element.util';
import { resolveEmojiPickerDataSource } from './utils/resolve-emoji-picker-data-source.util';

/**
 * Full emoji picker (categories, search, skin tones) backed by the `emoji-picker-element`
 * web component. Emits the picked emoji as a unicode string.
 *
 * ### When to use
 * - A rich, searchable emoji palette is needed (e.g. the rich text editor toolbar).
 * - Parity with a legacy full-featured emoji picker is required.
 *
 * ### When NOT to use
 * - A small fixed set of quick-access emojis is enough → render plain buttons instead.
 *
 * ### Related
 * - [Rich Text Editor](?path=/docs/components-rich-text-editor--docs) — primary consumer.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'ignt-emoji-picker',
  standalone: true,
  styleUrl: './emoji-picker.component.scss',
  templateUrl: './emoji-picker.component.html',
})
export class IgntEmojiPickerComponent {
  readonly #document = inject(DOCUMENT);

  /** Emits the picked emoji as a unicode string when the user selects one. */
  readonly emojiSelected = output<string>();

  protected readonly dataSource = resolveEmojiPickerDataSource(this.#document.baseURI);

  constructor() {
    loadEmojiPickerElement();
  }

  protected onEmojiClick(event: EmojiClickEvent): void {
    const { unicode } = event.detail;

    if (unicode !== undefined && unicode !== '') {
      this.emojiSelected.emit(unicode);
    }
  }
}
