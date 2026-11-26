import { Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';

@Component({
  selector: 'app-list-sorting',
  standalone: false,
  templateUrl: './list-sorting.component.html',
  styleUrls: ['./list-sorting.component.scss'],
})
export class ListSortingComponent<T> {
  @Input() template?: TemplateRef<unknown>;
  @Input() addElementControlTemplate?: TemplateRef<unknown>;
  @Output() elementsChange = new EventEmitter<Array<T>>();

  displayedElements: Array<T> = [];
  draggedIndex: number | null = null;
  dropIndex: number | null = null;
  usingTouch = false;

  private inputElements: Array<T> = [];

  @Input() set elements(input: Array<T>) {
    if (this.areTheSameElements(this.inputElements, input)) {
      return;
    }
    this.inputElements = input || [];
    this.displayedElements = [...this.inputElements];
  }

  onDragStart(index: number): void {
    this.draggedIndex = index;
    this.dropIndex = null;
  }

  onDragEnter(index: number): void {
    if (this.draggedIndex === null) {
      return;
    }
    this.dropIndex = index;
    this.displayedElements = this.moveItem(this.inputElements, this.draggedIndex, this.dropIndex);
  }

  trackByFn(index: number): number {
    return index;
  }

  onDragEnd(): void {
    if (this.draggedIndex !== this.dropIndex) {
      this.elementsChange.next(this.displayedElements);
    }
    this.reset();
  }

  onTouchMove(event: TouchEvent): void {
    if (this.draggedIndex === null) {
      return;
    }
    const touch = event.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const card = target?.closest('.sortable-item') as HTMLElement;
    const orderAttr = card?.getAttribute('data-order');
    const order = orderAttr !== null ? parseInt(orderAttr, 10) : Number.NaN;
    if (!isNaN(order)) {
      this.onDragEnter(order);
    }
  }

  private reset(): void {
    this.displayedElements = this.inputElements;
    this.draggedIndex = null;
    this.dropIndex = null;
  }

  private areTheSameElements(a: Array<T>, b: Array<T>): boolean {
    return a?.length === b?.length && a?.every((elem, i) => elem === b?.[i]);
  }

  private moveItem(arr: Array<T>, from: number, to: number): Array<T> {
    const result = [...arr];
    const element = result.splice(from, 1)[0];
    result.splice(to, 0, element);
    return result;
  }
}
