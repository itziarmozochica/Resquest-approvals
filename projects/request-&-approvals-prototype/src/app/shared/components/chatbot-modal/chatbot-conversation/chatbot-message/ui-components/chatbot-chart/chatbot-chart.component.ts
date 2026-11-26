import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, Signal, Type } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { ChatbotChartConfig } from '@fz-original/app/shared/models/chatbot/chatbot.model';
import { ChatbotFacade } from '@fz-original/app/shared/services/chatbot/chatbot.facade';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, of, switchMap } from 'rxjs';

import { CHART_REGISTRY, ChartRegistryEntry } from './chatbot-chart-registry';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet, TranslateModule],
  selector: 'app-chatbot-chart',
  standalone: true,
  styleUrls: ['./chatbot-chart.component.scss'],
  templateUrl: './chatbot-chart.component.html',
})
export class ChatbotChartComponent {
  #partnerService = inject(PartnerService);
  #chatbotFacade = inject(ChatbotFacade);

  data = input.required<{ id: string }>();

  #chartConfig: Signal<ChatbotChartConfig | null | undefined> = toSignal(
    toObservable(this.data).pipe(
      switchMap(({ id }) => {
        const partnerId = this.#partnerService.getPartner()?.id;
        if (partnerId === undefined || !id) return of(null);
        return this.#chatbotFacade.getChartConfig(partnerId, id).pipe(catchError(() => of(null)));
      }),
    ),
  );

  #registryEntry: Signal<ChartRegistryEntry | null> = computed(() => {
    const config = this.#chartConfig();
    if (!config) return null;
    return CHART_REGISTRY[config.type] ?? null;
  });

  readonly #chartComponentSignal = signal<Type<unknown> | null>(null);
  readonly #chartLoading = signal(false);

  readonly chartComponent = this.#chartComponentSignal.asReadonly();

  constructor() {
    effect(onCleanup => {
      const entry = this.#registryEntry();
      this.#chartComponentSignal.set(null);

      if (!entry) {
        this.#chartLoading.set(false);
        return;
      }

      let stale = false;
      onCleanup(() => {
        stale = true;
      });

      this.#chartLoading.set(true);
      entry
        .loadComponent()
        .then(c => {
          if (!stale) {
            this.#chartComponentSignal.set(c);
            this.#chartLoading.set(false);
          }
        })
        .catch(() => {
          if (!stale) this.#chartLoading.set(false);
        });
    });
  }

  chartComponentInputs: Signal<Record<string, unknown>> = computed(() => {
    const config = this.#chartConfig();
    const entry = this.#registryEntry();
    if (!config || !entry) return {};
    return entry.mapInputs(config);
  });

  isLoading: Signal<boolean> = computed(() => {
    if (this.#chartConfig() === undefined) return true;
    return this.#chartLoading();
  });
}
