import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { AggregateKpiItem } from '@fz-original/app/shared/models/plans-aggregates/aggregate-kpi-item.model';

import { getAggregateKpiGhostValue } from './utils/aggregate-kpi-ghost-value.util';
import { subscribeToAggregateKpiLayoutChanges, usesAggregateKpiHorizontalLayout } from './utils/aggregate-kpi-layout.util';
import {
  applyAggregateKpiValueFontSize,
  clearAggregateKpiValueFontSize,
  measureUnifiedAggregateKpiValueFontSize,
} from './utils/aggregate-kpi-value-font-size.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-busy]': 'loading()',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[style.--aggregate-kpi-columns]': 'columnCount()',
    role: 'group',
  },
  imports: [],
  selector: 'app-aggregate-kpi-bar',
  standalone: true,
  styleUrl: './aggregate-kpi-bar.component.scss',
  templateUrl: './aggregate-kpi-bar.component.html',
})
export class AggregateKpiBarComponent implements AfterViewInit {
  static readonly slotCount = 4;

  readonly #destroyRef = inject(DestroyRef);

  ariaLabel = input('');
  items = input<AggregateKpiItem[]>([]);
  labels = input<AggregateKpiItem[]>([]);
  loading = input(false);

  protected readonly barRef = viewChild<ElementRef<HTMLElement>>('barRef');
  protected readonly displayLabels = computed(() => {
    const labels = this.labels();

    if (labels.length > 0) {
      return labels;
    }

    return this.items().map(({ id, label }) => ({ id, label, value: '' }));
  });
  protected readonly accessibleKpiEntries = computed(() => {
    const labels = this.displayLabels();
    const itemsById = new Map(this.items().map(item => [item.id, item]));
    const loading = this.loading();

    return labels.map(label => {
      if (loading) {
        return { id: label.id, text: label.label };
      }

      const item = itemsById.get(label.id);

      return {
        id: label.id,
        text: item ? `${label.label}, ${item.value}` : label.label,
      };
    });
  });
  protected readonly columnCount = computed(() => {
    const labelCount = this.displayLabels().length;

    return labelCount > 0 ? labelCount : AggregateKpiBarComponent.slotCount;
  });
  protected readonly valueByLabelId = computed(() => new Map(this.items().map(item => [item.id, item.value])));
  protected readonly ghostValue = (labelId: string): string => getAggregateKpiGhostValue(labelId);

  #resizeObserver?: ResizeObserver;
  #syncFrame?: number;

  constructor() {
    effect(() => {
      this.items();
      this.loading();
      this.#scheduleFontSync();
    });
  }

  ngAfterViewInit(): void {
    const bar = this.barRef()?.nativeElement;

    this.#destroyRef.onDestroy(subscribeToAggregateKpiLayoutChanges(() => this.#scheduleFontSync()));

    if (!bar || typeof ResizeObserver === 'undefined') {
      this.#scheduleFontSync();
      return;
    }

    this.#resizeObserver = new ResizeObserver(() => this.#scheduleFontSync());
    this.#resizeObserver.observe(bar);
    this.#destroyRef.onDestroy(() => this.#resizeObserver?.disconnect());
    this.#scheduleFontSync();
  }

  #scheduleFontSync(): void {
    if (this.#syncFrame !== undefined) {
      cancelAnimationFrame(this.#syncFrame);
    }

    this.#syncFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.#syncFontSizes();
        this.#syncFrame = undefined;
      });
    });
  }

  #syncFontSizes(): void {
    const bar = this.barRef()?.nativeElement;

    if (!bar) {
      return;
    }

    const activeLayoutRoot = usesAggregateKpiHorizontalLayout() ? '.aggregate-kpi-bar__horizontal' : '.aggregate-kpi-bar__stacked';
    const inactiveLayoutRoot = usesAggregateKpiHorizontalLayout() ? '.aggregate-kpi-bar__stacked' : '.aggregate-kpi-bar__horizontal';

    this.#clearLayoutFontSizes(bar, inactiveLayoutRoot);
    this.#applyLayoutFontSizes(bar, activeLayoutRoot);
  }

  #applyLayoutFontSizes(bar: HTMLElement, layoutRoot: string): void {
    const valueElements = Array.from(bar.querySelectorAll<HTMLElement>(`${layoutRoot} .aggregate-kpi-bar__value`));

    if (!valueElements.length) {
      return;
    }

    valueElements.forEach(valueElement => {
      clearAggregateKpiValueFontSize(valueElement);
    });

    const unifiedValueFontSize = measureUnifiedAggregateKpiValueFontSize(valueElements);

    if (unifiedValueFontSize === null) {
      return;
    }

    valueElements.forEach(valueElement => {
      applyAggregateKpiValueFontSize(valueElement, unifiedValueFontSize);
    });
  }

  #clearLayoutFontSizes(bar: HTMLElement, layoutRoot: string): void {
    const valueElements = Array.from(bar.querySelectorAll<HTMLElement>(`${layoutRoot} .aggregate-kpi-bar__value`));

    valueElements.forEach(valueElement => {
      clearAggregateKpiValueFontSize(valueElement);
    });
  }
}
