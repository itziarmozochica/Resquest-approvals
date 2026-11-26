import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, Injector, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { AggregateKpiBarComponent } from '@fz-original/app/shared/components/aggregate-kpi-bar/aggregate-kpi-bar.component';
import { AggregateKpiItem } from '@fz-original/app/shared/models/plans-aggregates/aggregate-kpi-item.model';
import { PlansAggregatesQueryParams } from '@fz-original/app/shared/models/plans-aggregates/plans-aggregates-query-params.model';
import { PlansAggregatesService } from '@fz-original/app/shared/services/plans-aggregates/plans-aggregates.service';
import { plansAggregatesQueryParamsEqual } from '@fz-original/app/shared/services/plans-aggregates/utils/build-plans-aggregates-query-params.util';
import {
  mapPlansAggregatesToKpiItems,
  mapPlansAggregatesToKpiLabels,
} from '@fz-original/app/shared/services/plans-aggregates/utils/map-plans-aggregates-to-kpi-items.util';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { combineLatest, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AggregateKpiBarComponent, TranslateModule],
  selector: 'app-plans-aggregates-kpi-bar',
  standalone: true,
  styleUrl: './plans-aggregates-kpi-bar.component.scss',
  templateUrl: './plans-aggregates-kpi-bar.component.html',
})
export class PlansAggregatesKpiBarComponent {
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);
  readonly #plansAggregatesService = inject(PlansAggregatesService);
  readonly #translateService = inject(TranslateService);

  partnerId = input.required<number>();
  queryParams = input<PlansAggregatesQueryParams>({});

  protected readonly items = signal<AggregateKpiItem[]>([]);
  protected readonly labels = signal<AggregateKpiItem[]>([]);
  protected readonly loading = signal(false);

  constructor() {
    this.#refreshLabels();
    this.#translateService.onLangChange.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.#refreshLabels());

    combineLatest([
      toObservable(this.partnerId, { injector: this.#injector }),
      toObservable(this.queryParams, { injector: this.#injector }),
    ])
      .pipe(
        distinctUntilChanged(
          ([previousPartnerId, previousQuery], [nextPartnerId, nextQuery]) =>
            previousPartnerId === nextPartnerId && plansAggregatesQueryParamsEqual(previousQuery, nextQuery),
        ),
        switchMap(([partnerId, query]) => {
          if (!partnerId) {
            return of<AggregateKpiItem[]>([]);
          }

          this.loading.set(true);

          return this.#plansAggregatesService.getAggregates(partnerId, query).pipe(
            map(response =>
              mapPlansAggregatesToKpiItems(response.data, key => this.#translateService.instant(key), this.#translateService.currentLang),
            ),
            catchError((error: unknown) => {
              this.#logLoadError(partnerId, query, error);
              return of<AggregateKpiItem[]>([]);
            }),
          );
        }),
        tap(items => {
          this.items.set(items);
          this.loading.set(false);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #logLoadError(partnerId: number, query: PlansAggregatesQueryParams, error: unknown): void {
    const payload: Record<string, unknown> = {
      feature: 'plans_list_aggregates_kpi',
      partnerId,
      query,
    };

    if (error instanceof HttpErrorResponse) {
      payload.httpStatus = error.status;
      payload.url = error.url ?? undefined;
      payload.errorMessage = error.message;
    } else if (error instanceof Error) {
      payload.errorMessage = error.message;
    }

    this.#datadogLogService.logError('Plans list aggregates KPI bar failed to load', payload);
  }

  #refreshLabels(): void {
    this.labels.set(mapPlansAggregatesToKpiLabels(key => this.#translateService.instant(key)));
  }
}
