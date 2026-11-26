import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, type Signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, type Data } from '@angular/router';

import { IgntAlertComponent, IgntButtonComponent, IgntDialogRef, IgntDialogService } from '@ignite/common';
import {
  IGNT_TABLE_TRANSLATIONS,
  IgntTableColumnComponent,
  IgntTableColumnTemplateDirective,
  IgntTableComponent,
  type IgntTableSearchConfig,
  type IgntTableTranslations,
} from '@ignite/table';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, take } from 'rxjs';

import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { ChannelsSidePanelComponent } from '../../components/channels-side-panel/channels-side-panel.component';
import type { ChannelsSidePanelData } from '../../models/dialog/channels-side-panel.model';
import type { SalesRoutingViewFlow } from '../../models/sales-routing-view-resolve.model';
import type { Plan } from '../../models/sales-routing.model';
import { GroupChannelsPipe } from '../../pipes/group-channels.pipe';
import { SalesRoutingStore } from '../../store/sales-routing.store';

const SALES_ROUTING_LIST_TRANSLATIONS = 'salesRouting.list';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GroupChannelsPipe,
    EmptyStateComponent,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntTableColumnComponent,
    IgntTableColumnTemplateDirective,
    IgntTableComponent,
    NgOptimizedImage,
    TranslateModule,
  ],
  providers: [
    {
      deps: [TranslateService],
      multi: true,
      provide: IGNT_TABLE_TRANSLATIONS,
      useFactory: (translate: TranslateService): Signal<IgntTableTranslations> =>
        signal<IgntTableTranslations>({
          emptyMessage: String(translate.instant(`${SALES_ROUTING_LIST_TRANSLATIONS}.tableEmptyMessage`)),
          searchLabel: String(translate.instant(`${SALES_ROUTING_LIST_TRANSLATIONS}.searchLabel`)),
        }),
    },
  ],
  selector: 'fz-sales-routing-view',
  styleUrl: './sales-routing-view.component.scss',
  templateUrl: './sales-routing-view.component.html',
})
export class SalesRoutingViewComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #route = inject(ActivatedRoute);
  readonly #salesRoutingStore = inject(SalesRoutingStore);
  readonly #translateService = inject(TranslateService);

  readonly viewFlow = toSignal(this.#route.data.pipe(map((data: Data) => data.viewFlow as SalesRoutingViewFlow)), {
    initialValue: this.#route.snapshot.data.viewFlow as SalesRoutingViewFlow,
  });

  #channelsDialogRef: IgntDialogRef | null = null;

  protected readonly filteredPlans = computed(() => this.#salesRoutingStore.filteredPlans());
  protected readonly columnTemplateType = computed<Plan | undefined>(() => this.filteredPlans()[0]);
  protected readonly searchConfig = computed<IgntTableSearchConfig>(() => ({
    searchQuery: this.#salesRoutingStore.searchQuery(),
  }));

  protected readonly channelsCountLabel = toSignal(this.#translateService.stream(`${SALES_ROUTING_LIST_TRANSLATIONS}.channelsCount`), {
    initialValue: String(this.#translateService.instant(`${SALES_ROUTING_LIST_TRANSLATIONS}.channelsCount`)),
  });

  constructor() {
    this.#destroyRef.onDestroy(() => {
      this.#channelsDialogRef?.close();
      this.#channelsDialogRef = null;
    });
  }

  protected onChannelsClick(plan: Plan): void {
    if (plan.channels.length === 0) {
      return;
    }

    this.#channelsDialogRef?.close();
    this.#openChannelsSidePanel(plan);
  }

  protected onEditClick(_plan: Plan): void {
    // Edit sales routing navigation will be implemented when the flow is available.
  }

  protected onEmptySalesRoutingStateClick(): void {
    // Create sales routing navigation will be implemented when the flow is available.
  }

  protected onSearchChanged(query: string): void {
    this.#salesRoutingStore.setSearchQuery(query);
  }

  #openChannelsSidePanel(plan: Plan): void {
    const data: ChannelsSidePanelData = {
      channels: plan.channels,
      cityName: plan.cityName,
      placeName: plan.placeName,
      planName: plan.name,
      retailSetupType: this.#salesRoutingStore.retailSetupType(),
    };

    this.#channelsDialogRef = this.#dialogService.openSidePanel(ChannelsSidePanelComponent, { data });
    this.#channelsDialogRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#channelsDialogRef = null;
    });
  }
}
