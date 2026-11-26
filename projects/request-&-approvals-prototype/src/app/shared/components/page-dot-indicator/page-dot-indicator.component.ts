import { NgForOf } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';

@Component({
  selector: 'app-page-dot-indicator',
  standalone: true,
  templateUrl: './page-dot-indicator.component.html',
  styleUrls: ['./page-dot-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgForOf],
})
export class PageDotIndicatorComponent {
  #totalPagesSignal = signal(0);

  @Input()
  set totalPages(value: number) {
    this.#totalPagesSignal.set(value);
  }

  @Input() currentPageIndex = 0;

  pages = computed(() => Array.from({ length: this.#totalPagesSignal() }, (_, i) => i));

  @Output() pageSelected = new EventEmitter<number>();

  onDotClick(pageIndex: number): void {
    this.pageSelected.emit(pageIndex);
  }
}
