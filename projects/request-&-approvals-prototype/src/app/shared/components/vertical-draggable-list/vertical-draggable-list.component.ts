import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPlaceholder, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, TemplateRef } from '@angular/core';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDropList, CdkDrag, CdkDragHandle, CdkDragPlaceholder, FaIconComponent, NgTemplateOutlet],
  selector: 'app-vertical-draggable-list',
  standalone: true,
  styleUrls: ['./vertical-draggable-list.component.scss'],
  templateUrl: './vertical-draggable-list.component.html',
})
export class VerticalDraggableListComponent<T> {
  readonly boundarySelector = input.required<string>();
  readonly disabled = input<boolean>(false);
  readonly dragHandleIcon = input<IconProp>(['fas', 'bars']);
  /** When set, replaces the drag-handle icon with custom content (disabled items keep the lock icon). */
  readonly handleTemplate = input<TemplateRef<unknown> | null>(null);
  readonly isItemDisabled = input<(item: T) => boolean>(() => false);
  readonly items = input.required<T[]>();
  readonly itemsReordered = output<T[]>();
  readonly itemTemplate = input.required<TemplateRef<{ $implicit: T; index: number }>>();
  readonly moveDownLabel = input<string>('');
  readonly moveUpLabel = input<string>('');
  readonly placeholderHeight = input.required<string>();
  readonly reorderable = input<boolean>(true);
  readonly showItemOrder = input<boolean>(false);
  readonly showReorderButtons = input<boolean>(false);
  /** When true, the entire item is draggable; when false, only the handle triggers drag. */
  readonly wholeItemDraggable = input<boolean>(false);

  onDrop({ previousIndex, currentIndex }: CdkDragDrop<T[]>): void {
    this.#move(previousIndex, currentIndex);
  }

  moveUp(index: number): void {
    this.#move(index, index - 1);
  }

  moveDown(index: number): void {
    this.#move(index, index + 1);
  }

  #move(previousIndex: number, currentIndex: number): void {
    if (previousIndex === currentIndex || currentIndex < 0 || currentIndex >= this.items().length) {
      return;
    }

    const items = [...this.items()];
    const adjustedIndex = this.#calculateAdjustedIndex(previousIndex, currentIndex, items);

    if (adjustedIndex === null || previousIndex === adjustedIndex) {
      return;
    }

    moveItemInArray(items, previousIndex, adjustedIndex);
    this.itemsReordered.emit(items);
  }

  #adjustForDisabledItems(previousIndex: number, currentIndex: number, disabledIndices: number[]): number {
    const firstDisabledIndex = Math.min(...disabledIndices);

    if (currentIndex === firstDisabledIndex) {
      return firstDisabledIndex + 1;
    }

    if (currentIndex < firstDisabledIndex && previousIndex >= firstDisabledIndex) {
      return firstDisabledIndex + 1;
    }

    return currentIndex;
  }

  #calculateAdjustedIndex(previousIndex: number, currentIndex: number, items: T[]): number | null {
    const disabledIndices = this.#getDisabledIndices(items);
    let adjustedIndex = currentIndex;

    if (disabledIndices.length > 0) {
      adjustedIndex = this.#adjustForDisabledItems(previousIndex, currentIndex, disabledIndices);
      if (adjustedIndex === null) return null;
    }

    adjustedIndex = this.#clampIndex(adjustedIndex, items.length);

    if (disabledIndices.includes(adjustedIndex)) {
      return this.#findNextAvailableIndex(disabledIndices, items.length);
    }

    return adjustedIndex;
  }

  #clampIndex(index: number, itemsLength: number): number {
    if (index < 0) {
      return 0;
    }
    if (index >= itemsLength) {
      return itemsLength - 1;
    }
    return index;
  }

  #findNextAvailableIndex(disabledIndices: number[], itemsLength: number): number | null {
    const lastDisabledIndex = Math.max(...disabledIndices);
    const nextAvailableIndex = lastDisabledIndex + 1;

    if (nextAvailableIndex < itemsLength) {
      return nextAvailableIndex;
    }

    return null;
  }

  #getDisabledIndices(items: T[]): number[] {
    const isDisabledChecker = this.isItemDisabled();
    if (!isDisabledChecker) return [];

    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => isDisabledChecker(item))
      .map(({ index }) => index);
  }
}
