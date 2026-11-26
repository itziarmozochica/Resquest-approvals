import { ChangeDetectionStrategy, Component, effect, input, output, signal, ViewEncapsulation } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { ExpandableRichTextEditorComponent } from '../../components/expandable-rich-text-editor/expandable-rich-text-editor.component';
import { LocalImageUploadComponent } from '../../components/local-image-upload/local-image-upload.component';
import { PropLabelComponent } from '../../components/prop-label/prop-label.component';
import { BlockOf, ImageGridItem, ImageGridProps } from '../../models/block.model';
import { isContractFieldMissing } from '../block-validation.util';
import { IMAGE_GRID_FIELDS } from './image-grid.field-contract';
import { normalizeImageGridItems } from './image-grid.helpers';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [TranslateModule, ExpandableRichTextEditorComponent, LocalImageUploadComponent, PropLabelComponent],
  selector: 'app-db-image-grid-properties',
  standalone: true,
  styleUrl: './image-grid-properties.component.scss',
  templateUrl: './image-grid-properties.component.html',
})
export class ImageGridPropertiesComponent {
  readonly block = input.required<BlockOf<'imageGrid'>>();
  readonly uploadImageCallback = input.required<(file: File) => Observable<string>>();
  readonly disabled = input<boolean>(false);
  readonly highlightMissingMandatory = input<boolean>(false);
  readonly propsChange = output<ImageGridProps>();

  readonly FIELDS = IMAGE_GRID_FIELDS;

  readonly imageGridCardTab = signal(0);

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
      this.imageGridCardTab.set(0);
    });

    effect(() => {
      const maxIndex = this.imageGridItems().length - 1;
      if (this.imageGridCardTab() > maxIndex) {
        this.imageGridCardTab.set(Math.max(0, maxIndex));
      }
    });
  }

  imageGridItems(): ImageGridItem[] {
    return normalizeImageGridItems(this.block().props.items);
  }

  currentGridItem(): ImageGridItem {
    return this.imageGridItems()[this.imageGridCardTab()];
  }

  setGridItemSrc(dataUrl: string): void {
    this.#patchCurrentItem({ src: dataUrl });
  }

  clearGridItemSrc(): void {
    this.#patchCurrentItem({ src: '' });
  }

  setGridItemTitle(value: string): void {
    this.#patchCurrentItem({ title: value });
  }

  setGridItemBody(value: string): void {
    this.#patchCurrentItem({ body: value });
  }

  /** Missing-state of the displayed grid item's field (cards are edited one at a time). */
  isMissing(field: string): boolean {
    return this.highlightMissingMandatory() && isContractFieldMissing(IMAGE_GRID_FIELDS, this.currentGridItem(), field);
  }

  #patchCurrentItem(patch: Partial<ImageGridItem>): void {
    const next = this.imageGridItems().map((row, j) => (j === this.imageGridCardTab() ? { ...row, ...patch } : row));
    this.propsChange.emit({ ...this.block().props, items: next });
  }
}
