import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  EventEmitter,
  input,
  Input,
  linkedSignal,
  Output,
  Signal,
  signal,
  viewChild,
  WritableSignal,
} from '@angular/core';

import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { TableType } from '@fz-original/app/shared/components/table/table.component';
import { ProductSession } from '@fz-original/app/shared/models/product-sessions-summary/product-sessions-summary-response.model';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-oss-search-table',
  templateUrl: './oss-search-table.component.html',
  styleUrls: ['./oss-search-table.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, IgntIconComponent, SharedComponentsModule, TranslateModule],
})
export class OssSearchTableComponent {
  static readonly rowsPerPage = 50;
  static readonly loadMoreMarginPx = 200;

  private readonly loadMoreSentinel = viewChild<ElementRef<HTMLElement>>('loadMoreSentinel');
  private readonly scrollWrapper = viewChild<ElementRef<HTMLElement>>('scrollWrapper');
  #pulseTimeout: number | null = null;
  headers = [
    { key: 'name', label: 'oneStopShop.search.table.name', columnSize: '40%', hasBorderLeft: false, alignment: 'start' },
    { key: 'sku', label: 'SKU', columnSize: '20%', hasBorderLeft: false, alignment: 'start' },
    { key: 'gtin', label: 'GTIN', columnSize: '20%', hasBorderLeft: false, alignment: 'start' },
    { key: 'price', label: 'oneStopShop.search.table.price', columnSize: '10%', hasBorderLeft: false, alignment: 'start' },
    { key: 'action', label: '', columnSize: '10%', hasBorderLeft: false, alignment: 'end' },
  ];
  @Input({ required: true }) locale = '';
  pulsingSessionId: WritableSignal<number | null> = signal(null);
  readonly sessions = input<ProductSession[]>([]);
  readonly #visibleRowCount = linkedSignal({ source: this.sessions, computation: () => OssSearchTableComponent.rowsPerPage });
  @Output() sessionSelected = new EventEmitter<ProductSession>();
  showFloatingHeaders: WritableSignal<boolean> = signal(false);
  readonly hasMoreRows: Signal<boolean> = computed(() => this.#visibleRowCount() < this.sessions().length);
  readonly visibleSessions: Signal<ProductSession[]> = computed(() => this.sessions().slice(0, this.#visibleRowCount()));

  protected readonly TableType = TableType;

  constructor() {
    effect(onCleanup => {
      this.#visibleRowCount();
      const sentinel = this.loadMoreSentinel()?.nativeElement;
      const scrollWrapper = this.scrollWrapper()?.nativeElement;
      if (!sentinel || !scrollWrapper) {
        return;
      }
      const loadMoreObserver = new IntersectionObserver(
        entries => {
          if (entries.some(entry => entry.isIntersecting)) {
            this.#visibleRowCount.update(count => count + OssSearchTableComponent.rowsPerPage);
          }
        },
        { root: scrollWrapper, rootMargin: `${OssSearchTableComponent.loadMoreMarginPx}px` },
      );
      loadMoreObserver.observe(sentinel);
      onCleanup(() => loadMoreObserver.disconnect());
    });
  }

  isPulsing(sessionId: number): boolean {
    return this.pulsingSessionId() === sessionId;
  }

  onAddToCart(session: ProductSession): void {
    if (this.#pulseTimeout !== null) {
      clearTimeout(this.#pulseTimeout);
      this.#pulseTimeout = null;
    }

    this.pulsingSessionId.set(null);

    requestAnimationFrame(() => {
      this.pulsingSessionId.set(session.id);

      this.#pulseTimeout = setTimeout(() => {
        this.pulsingSessionId.set(null);
        this.#pulseTimeout = null;
      }, 600) as unknown as number;
    });

    this.sessionSelected.emit(session);
  }

  onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const scrolled = target.scrollTop > 30;
    this.showFloatingHeaders.set(scrolled);
  }
}
