import {
  afterNextRender,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  OnDestroy,
  output,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SecondScreenSeatingMapStorageService } from '@fz-original/app/modules/box-office/obo-second-screen/services/seating-map/second-screen-seating-map-storage.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { SeatingMapQuery } from '@fz-original/app/shared/models/seating-map/seating-map-query';
import { SeatingMap } from '@fz-original/app/shared/models/seating-map/seating-map.model';
import { SeatingProviderEnum } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seating-provider.enum';
import { SeatingMapService } from '@fz-original/app/shared/services/seating-map/seating-map.service';
import { Subscription, timer } from 'rxjs';
import { first, map, shareReplay, timeout } from 'rxjs/operators';

import { OboSecondScreenCart } from '../../models/obo-second-screen-cart.model';
import { SecondScreenPlanShowSeatingMapOptions } from '../../models/seating-map/obo-second-screen-seating-map-plan';
import { OboSecondScreenStoredSeatingMap } from '../../models/seating-map/obo-second-screen-seating-map.model';
import { OboSecondScreenSeatingMapService } from '../../services/seating-map/obo-second-screen-seating-map.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  providers: [OboSecondScreenSeatingMapService],
  selector: 'app-obo-seating-map',
  standalone: true,
  styleUrl: './seating-map.component.scss',
  templateUrl: './seating-map.component.html',
})
export class SeatingMapComponent implements OnDestroy {
  static readonly seatsIoPollMs = 250;
  static readonly seatsIoWaitMs = 10_000;

  #changeDetectorRef = inject(ChangeDetectorRef);
  #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);
  #oboSecondScreenSeatingMapService = inject(OboSecondScreenSeatingMapService);
  #seatingMapService = inject(SeatingMapService);
  #secondScreenSeatingMapStorageService = inject(SecondScreenSeatingMapStorageService);
  #activeEventKey: string | null = null;
  #activeMapKey: string | null = null;
  #activeSourceKey: string | null = null;
  #mapRequestId = 0;
  #seatsIoWait = new Subscription();
  readonly #seatsIoLoaded = timer(SeatingMapComponent.seatsIoPollMs, SeatingMapComponent.seatsIoPollMs).pipe(
    first(() => this.#oboSecondScreenSeatingMapService.isSeatsIoLoaded()),
    timeout(SeatingMapComponent.seatsIoWaitMs),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  cart = input<OboSecondScreenCart | null>(null);
  isActive = input(false);
  partnerId = input<number | null>(null);
  seatingMap = input<OboSecondScreenStoredSeatingMap | null>(null);
  readonly unavailable = output<void>();

  readonly seatingMapDivId = 'obo-second-screen-seating-map';
  showSeatingMap = false;

  constructor() {
    effect(() => {
      const active = this.isActive();
      if (!active) {
        this.#dropSeatsIoWait();
        ++this.#mapRequestId;
        return;
      }
      untracked(() => this.#syncOrRefresh({ forceZoomOut: true }));
    });

    effect(() => {
      this.cart();
      this.partnerId();
      this.seatingMap();
      if (!untracked(() => this.isActive())) {
        return;
      }
      untracked(() => this.#refreshSeatingMapDefinition());
    });

    this.#secondScreenSeatingMapStorageService
      .observeSecondScreenSeatingMapStorage()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        if (!this.isActive()) {
          return;
        }
        this.#syncOrRefresh();
      });
  }

  ngOnDestroy(): void {
    this.#oboSecondScreenSeatingMapService.destroyChart();
  }

  #ensureMapContainerVisible(): void {
    if (!this.showSeatingMap) {
      this.showSeatingMap = true;
      this.#changeDetectorRef.detectChanges();
    }
  }

  #dropSeatsIoWait(): void {
    this.#seatsIoWait.unsubscribe();
    this.#seatsIoWait = new Subscription();
  }

  #failSeatingMap(): void {
    this.#hideSeatingMap();
    this.unavailable.emit();
  }

  #fetchSeatingMapForSessionIds(sessionIds: number[]): void {
    const partnerId = this.partnerId();
    if (!partnerId || sessionIds.length === 0) {
      this.#hideSeatingMap();
      return;
    }

    const sourceKey = `${partnerId}|${sessionIds.join(',')}`;
    const currentEventKey = this.#getStoredEventKey();
    if (
      this.#activeSourceKey === sourceKey &&
      this.#activeEventKey === currentEventKey &&
      this.#oboSecondScreenSeatingMapService.getChart()
    ) {
      this.#ensureMapContainerVisible();
      this.#syncHighlightedSeatsWithChart();
      return;
    }

    this.#activeSourceKey = sourceKey;
    const mapRequestId = ++this.#mapRequestId;
    const query: SeatingMapQuery = {
      channel: null,
      partnerId,
      readonly: true,
      sessionIds,
    };

    this.#seatingMapService
      .getSeatingMap(query)
      .pipe(
        map((response: BaseResponse<SeatingMap>) => this.#mapBaseResponse(response)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: () => {
          if (mapRequestId !== this.#mapRequestId) {
            return;
          }
          this.#failSeatingMap();
        },
        next: (seatingMap: SeatingMap | null) => {
          if (mapRequestId !== this.#mapRequestId) {
            return;
          }
          if (!seatingMap) {
            this.#failSeatingMap();
            return;
          }

          const highlightedSeats = this.#oboSecondScreenSeatingMapService.normalizeSeats(
            this.#secondScreenSeatingMapStorageService.getSecondScreenSeatingMapHighlightedSeats(seatingMap.id) ?? [],
          );
          const mapKey = `${seatingMap.id}|${seatingMap.providerPublicKey}|${(seatingMap.channels ?? []).join(',')}`;
          this.#ensureMapContainerVisible();
          this.#activeEventKey = seatingMap.id;

          if (this.#activeMapKey !== mapKey || !this.#oboSecondScreenSeatingMapService.getChart()) {
            this.#activeMapKey = mapKey;
            afterNextRender(
              () => {
                if (mapRequestId === this.#mapRequestId) {
                  this.#renderSeatingMap(seatingMap, highlightedSeats);
                }
              },
              { injector: this.#injector },
            );
            return;
          }

          this.#oboSecondScreenSeatingMapService.updateHighlightedSeats(highlightedSeats);
        },
      });
  }

  #getSessionIds(): number[] {
    // No context, or one stored without session ids by a POS tab not yet reloaded: every cart line counts
    const sessionIds = this.seatingMap()?.sessionIds ?? (this.cart()?.sessions ?? []).map(session => session.sessionId);
    return sessionIds
      .filter((sessionId): sessionId is number => typeof sessionId === 'number')
      .sort((firstSessionId: number, secondSessionId: number) => firstSessionId - secondSessionId);
  }

  #getStoredEventKey(): string | null {
    const parsed = this.#secondScreenSeatingMapStorageService.getSecondScreenSeatingMapStoragePayload();
    return typeof parsed?.eventKey === 'string' ? parsed.eventKey : null;
  }

  #hideSeatingMap(): void {
    this.#dropSeatsIoWait();
    ++this.#mapRequestId;
    this.showSeatingMap = false;
    this.#activeMapKey = null;
    this.#activeSourceKey = null;
    this.#activeEventKey = null;
    this.#oboSecondScreenSeatingMapService.destroyChart();
    this.#changeDetectorRef.markForCheck();
  }

  #isOneBoxSeatingMap(): boolean {
    return this.seatingMap()?.provider === SeatingProviderEnum.ONEBOX;
  }

  #mapBaseResponse<T>({ data, error }: BaseResponse<T>): T | null {
    if (error) {
      throw error;
    }
    return data;
  }

  #refreshSeatingMapDefinition(): void {
    if (this.#isOneBoxSeatingMap()) {
      this.#hideSeatingMap();
      return;
    }

    const sessionIds = this.#getSessionIds();
    if (sessionIds.length === 0) {
      ++this.#mapRequestId;
      if (this.#oboSecondScreenSeatingMapService.getChart()) {
        const currentEventKey = this.#getStoredEventKey();
        if (this.#activeEventKey !== currentEventKey) {
          this.#renderFromStorageFallback();
          return;
        }
        // Keep rendered map mounted; only refresh highlighted seats.
        this.#syncHighlightedSeatsWithChart();
        return;
      }
      this.#renderFromStorageFallback();
      return;
    }

    if (!this.partnerId()) {
      this.#hideSeatingMap();
      return;
    }

    this.#fetchSeatingMapForSessionIds(sessionIds);
  }

  #renderFromStorageFallback(): void {
    const parsedLocalStorage = this.#secondScreenSeatingMapStorageService.getSecondScreenSeatingMapStoragePayload();
    const plan = this.#oboSecondScreenSeatingMapService.planRenderFromStorageFallback({
      activeMapKey: this.#activeMapKey,
      hasChart: !!this.#oboSecondScreenSeatingMapService.getChart(),
      partnerId: this.partnerId(),
      payload: parsedLocalStorage,
    });

    switch (plan.kind) {
      case 'clearSeatingMap':
        this.#oboSecondScreenSeatingMapService.updateHighlightedSeatsFromStoragePayload(null);
        this.#ensureMapContainerVisible();
        return;
      case 'fetchSeatingMapForSessionIds': {
        const sessionIds = (plan.options as { sessionIds: number[] }).sessionIds;
        this.#fetchSeatingMapForSessionIds(sessionIds);
        return;
      }
      case 'hideSeatingMap':
        this.#hideSeatingMap();
        return;
      case 'showSeatingMap': {
        const options = plan.options as SecondScreenPlanShowSeatingMapOptions;
        this.#ensureMapContainerVisible();
        this.#activeEventKey = options.eventKey;
        if (options.fullRender) {
          this.#activeMapKey = options.mapKey;
          this.#activeSourceKey = null;
          const mapRequestId = this.#mapRequestId;
          afterNextRender(
            () => {
              if (mapRequestId === this.#mapRequestId) {
                this.#renderSeatingMap(
                  {
                    channels: options.channels,
                    id: options.eventKey,
                    providerPublicKey: options.workspaceKey,
                  } as SeatingMap,
                  options.highlightedSeats,
                );
              }
            },
            { injector: this.#injector },
          );
          return;
        }
        this.#oboSecondScreenSeatingMapService.updateHighlightedSeatsFromStoragePayload(options.payload);
        return;
      }
    }
  }

  #renderOnceSeatsIoLoads(seatingMap: SeatingMap, highlightedSeats: string[]): void {
    const mapRequestId = this.#mapRequestId;
    this.#seatsIoWait.add(
      this.#seatsIoLoaded.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
        error: () => {
          if (mapRequestId === this.#mapRequestId) {
            this.#failSeatingMap();
          }
        },
        next: () => {
          if (mapRequestId === this.#mapRequestId) {
            this.#renderSeatingMap(seatingMap, highlightedSeats);
          }
        },
      }),
    );
  }

  #renderSeatingMap(seatingMap: SeatingMap, highlightedSeats: string[]): void {
    if (!this.#oboSecondScreenSeatingMapService.isSeatsIoLoaded()) {
      this.#renderOnceSeatsIoLoads(seatingMap, highlightedSeats);
      return;
    }

    const mapRequestId = this.#mapRequestId;
    const rendered = this.#oboSecondScreenSeatingMapService.renderSeatingMap(this.seatingMapDivId, seatingMap, highlightedSeats, () => {
      if (this.isActive()) {
        this.#failSeatingMap();
      } else {
        this.#hideSeatingMap();
      }
    });
    if (!rendered) {
      this.#failSeatingMap();
      return;
    }
    if (mapRequestId !== this.#mapRequestId) {
      return;
    }
    this.#activeEventKey = seatingMap.id;
  }

  #syncHighlightedSeatsWithChart(forceZoomOut: boolean = false): void {
    if (!this.#oboSecondScreenSeatingMapService.getChart() || !this.#activeEventKey) {
      return;
    }

    const highlightedSeats = this.#oboSecondScreenSeatingMapService.normalizeSeats(
      this.#secondScreenSeatingMapStorageService.getSecondScreenSeatingMapHighlightedSeats(this.#activeEventKey ?? undefined) ?? [],
    );
    this.#oboSecondScreenSeatingMapService.updateHighlightedSeats(highlightedSeats, forceZoomOut);
  }

  #syncOrRefresh({ forceZoomOut = false }: { forceZoomOut?: boolean } = {}): void {
    const currentEventKey = this.#getStoredEventKey();
    if (this.#oboSecondScreenSeatingMapService.getChart() && this.#activeEventKey && this.#activeEventKey === currentEventKey) {
      this.#syncHighlightedSeatsWithChart(forceZoomOut);
      return;
    }

    this.#refreshSeatingMapDefinition();
  }
}
