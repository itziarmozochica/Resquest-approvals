import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  QueueMetric,
  QueueOverview,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/queue/queue-overview.model';
import { QueueSettingsService } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/services/queue/queue-settings.service';
import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { IgntAlertComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';
import { EMPTY, interval, of } from 'rxjs';
import { catchError, map, startWith, switchMap, takeWhile, tap } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, IconsModule, SharedComponentsModule, TranslateModule],
  selector: 'app-queue-panel',
  standalone: true,
  styleUrls: ['./queue-panel.component.scss'],
  templateUrl: './queue-panel.component.html',
})
export class QueuePanelComponent {
  static readonly cardMetricKeys = [
    'total_inflow',
    'total_waiting_in_queue',
    'unused_queue_numbers',
    'estimated_wait_seconds',
    'safetynet_outflow',
    'current_outflow',
    'total_outflow',
    'max_outflow',
  ] as const;
  static readonly pollingIntervalMs = 60_000;

  #destroyRef = inject(DestroyRef);
  #queueSettingsService = inject(QueueSettingsService);

  get isQueueStopped(): boolean {
    const status = this.overview()?.status;
    return status === 'stopped' || status === 'inactive';
  }

  cardMetrics: WritableSignal<QueueMetric[]> = signal<QueueMetric[]>([]);
  channelId = input<string | null>(null);
  error: WritableSignal<string | null> = signal<string | null>(null);
  isLoading: WritableSignal<boolean> = signal<boolean>(true);
  overview: WritableSignal<QueueOverview | null> = signal<QueueOverview | null>(null);
  partnerId = input.required<number>();
  planId = input.required<number>();

  constructor() {
    effect(onCleanup => {
      const partnerId = this.partnerId();
      const planId = this.planId();
      this.isLoading.set(true);
      this.error.set(null);
      const channelId = this.channelId();
      const sub = interval(QueuePanelComponent.pollingIntervalMs)
        .pipe(
          startWith(0),
          switchMap(() =>
            this.#queueSettingsService.getQueueOverview(partnerId, planId, channelId).pipe(
              tap((data: QueueOverview | null) => this.#showOverview(data)),
              map((data: QueueOverview | null) => data !== null),
              catchError((error: unknown) => {
                this.#showError();
                return this.#isForbidden(error) ? of(false) : EMPTY;
              }),
            ),
          ),
          takeWhile((keepPolling: boolean) => keepPolling),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe();
      onCleanup(() => sub.unsubscribe());
    });
  }

  metricDisplay(metric: QueueMetric): string {
    if (metric.value == null) return '—';
    if (metric.unit === 'seconds' && typeof metric.numericValue === 'number') {
      const totalSeconds = Math.floor(metric.numericValue);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }
    return String(metric.value);
  }

  metricLabel(metric: QueueMetric): string {
    return `queue.metric.${metric.key}`;
  }

  metricUnit(metric: QueueMetric): string {
    if (metric.key === 'max_outflow' && metric.unit === 'per_minute') return 'queue.unit.per_minute';
    return '';
  }

  #isForbidden(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      error.error instanceof HttpErrorResponse &&
      error.error.status === HttpStatusCode.Forbidden
    );
  }

  #showError(): void {
    this.error.set('queue.error');
    this.overview.set(null);
    this.cardMetrics.set([]);
    this.isLoading.set(false);
  }

  #showOverview(data: QueueOverview | null): void {
    this.error.set(null);
    this.overview.set(data);
    this.#buildCardMetrics(data);
    this.isLoading.set(false);
  }

  #buildCardMetrics(ov: QueueOverview | null): void {
    if (ov === null) {
      this.cardMetrics.set([]);
      return;
    }
    const cards: QueueMetric[] = QueuePanelComponent.cardMetricKeys
      .map(key => ov.metrics.find((metric: QueueMetric) => metric.key === key))
      .filter((m): m is QueueMetric => m !== undefined && m.renderType === 'card');
    this.cardMetrics.set(cards);
  }
}
