import { Injectable } from '@angular/core';

import { SeatingMap } from '@fz-original/app/shared/models/seating-map/seating-map.model';
import { SecondScreenSeatingMapStorage } from '@fz-original/app/shared/models/seating-map/second-screen-seating-map-storage.model';
import Seatsio from '@seatsio/seatsio-types';

import { SecondScreenPlan, SecondScreenPlanShowSeatingMapOptions } from '../../models/seating-map/obo-second-screen-seating-map-plan';

@Injectable()
export class OboSecondScreenSeatingMapService {
  #activeHighlightedSeatsKey = '';
  #chart: Seatsio.SeatingChart | null = null;

  destroyChart(): void {
    this.#chart?.destroy();
    this.#chart = null;
    this.#activeHighlightedSeatsKey = '';
  }

  getChart(): Seatsio.SeatingChart | null {
    return this.#chart;
  }

  getHighlightedSeatsFromStoragePayload(payload: Partial<SecondScreenSeatingMapStorage> | null): string[] {
    if (!payload) {
      return [];
    }

    const rawSeats = Array.isArray(payload.seats) ? payload.seats.filter((seat): seat is string => typeof seat === 'string') : [];
    return this.normalizeSeats(rawSeats);
  }

  isSeatsIoLoaded(): boolean {
    return (window.seatsio as Seatsio.Seatsio | undefined) !== undefined;
  }

  normalizeSeats(seats: string[]): string[] {
    return [...new Set(seats)].sort((firstSeat: string, secondSeat: string) => firstSeat.localeCompare(secondSeat));
  }

  /**
   * Pure decision tree for second-screen storage fallback (no DOM, HTTP, or timers).
   * Caller applies visibility, fetches, and scheduled render.
   */
  planRenderFromStorageFallback(options: {
    activeMapKey: string | null;
    hasChart: boolean;
    partnerId: number | null;
    payload: Partial<SecondScreenSeatingMapStorage> | null;
  }): SecondScreenPlan {
    const { activeMapKey, hasChart, partnerId, payload } = options;

    if (!payload) {
      return hasChart ? { kind: 'clearSeatingMap' } : { kind: 'hideSeatingMap' };
    }

    try {
      const parsed = this.#parseStoragePayloadFields(payload);
      const highlightedSeats = this.getHighlightedSeatsFromStoragePayload(payload);

      if ((!parsed.eventKey || !parsed.workspaceKey) && partnerId && parsed.sessionIds.length > 0) {
        return {
          kind: 'fetchSeatingMapForSessionIds',
          options: { sessionIds: parsed.sessionIds },
        };
      }

      if (!parsed.eventKey || !parsed.workspaceKey) {
        return hasChart ? { kind: 'clearSeatingMap' } : { kind: 'hideSeatingMap' };
      }

      const mapKey = `${parsed.eventKey}|${parsed.workspaceKey}|${parsed.channels.join(',')}`;
      const fullRender = activeMapKey !== mapKey || !hasChart;

      return {
        kind: 'showSeatingMap',
        options: {
          channels: parsed.channels,
          eventKey: parsed.eventKey,
          fullRender,
          highlightedSeats,
          mapKey,
          payload,
          workspaceKey: parsed.workspaceKey,
        } satisfies SecondScreenPlanShowSeatingMapOptions,
      };
    } catch {
      return { kind: 'hideSeatingMap' };
    }
  }

  renderSeatingMap(divId: string, seatingMap: SeatingMap, highlightedSeats: string[], onRenderingFailed: () => void): boolean {
    const seatsIo = window.seatsio as Seatsio.Seatsio | undefined;
    if (!seatsIo) {
      return false;
    }

    this.destroyChart();
    this.#activeHighlightedSeatsKey = this.#getSeatsKey(highlightedSeats);
    try {
      const chart: Seatsio.SeatingChart = new seatsIo.SeatingChart({
        channels: seatingMap.channels ?? [],
        divId,
        event: seatingMap.id,
        extraConfig: { highlightedSeats },
        fitTo: 'widthAndHeight',
        mode: 'static',
        objectTooltip: {
          showUnavailableNotice: false,
        },
        showFullScreenButton: false,
        showLegend: false,
        workspaceKey: seatingMap.providerPublicKey,
        objectColor: function (object: Seatsio.SelectableObject, defaultColor: string, extraConfig?: Seatsio.ExtraConfig) {
          const config = extraConfig as { highlightedSeats?: string[] } | undefined;
          const highlighted = config?.highlightedSeats ?? [];
          if (highlighted.includes(object.label ?? '')) {
            return '#FF6D00';
          }
          return defaultColor;
        },
        objectIcon: function (object, defaultIcon, extraConfig?: Seatsio.ExtraConfig) {
          const config = extraConfig as { highlightedSeats?: string[] } | undefined;
          const highlighted = config?.highlightedSeats ?? [];
          if (highlighted.includes(object.label ?? '')) {
            return 'user-circle';
          }
          return defaultIcon as string;
        },
        onChartRendered: (chart: Seatsio.SeatingChart) => {
          if (highlightedSeats.length > 0) {
            chart.zoomToObjects(highlightedSeats);
            return;
          }
          chart.resetView();
        },
        onChartRenderingFailed: () => {
          if (chart === this.#chart) {
            onRenderingFailed();
          }
        },
      });
      this.#chart = chart;
      chart.render();
      return true;
    } catch {
      this.destroyChart();
      return false;
    }
  }

  updateHighlightedSeats(highlightedSeats: string[], forceZoomOut: boolean = false): void {
    if (!this.#chart) {
      return;
    }

    const highlightedSeatsKey = this.#getSeatsKey(highlightedSeats);
    const shouldForceResetView = forceZoomOut && highlightedSeats.length === 0;
    if (highlightedSeatsKey === this.#activeHighlightedSeatsKey && !shouldForceResetView) {
      return;
    }

    this.#activeHighlightedSeatsKey = highlightedSeatsKey;
    this.#chart
      .changeConfig({ extraConfig: { highlightedSeats } })
      .then(async () => {
        if (highlightedSeats.length > 0) {
          await this.#chart?.zoomToObjects(highlightedSeats);
          return;
        }
        await this.#chart?.resetView();
      })
      .catch(() => {
        return;
      });
  }

  updateHighlightedSeatsFromStoragePayload(payload: Partial<SecondScreenSeatingMapStorage> | null, forceZoomOut: boolean = false): void {
    this.updateHighlightedSeats(this.getHighlightedSeatsFromStoragePayload(payload), forceZoomOut);
  }

  #getSeatsKey(seats: string[]): string {
    return seats.join('|');
  }

  #parseStoragePayloadFields(payload: Partial<SecondScreenSeatingMapStorage>): {
    channels: string[];
    eventKey: string | null;
    sessionIds: number[];
    workspaceKey: string | null;
  } {
    const eventKey = typeof payload.eventKey === 'string' ? payload.eventKey : null;
    const workspaceKey = typeof payload.providerPublicKey === 'string' ? payload.providerPublicKey : null;
    const channels = Array.isArray(payload.channels)
      ? payload.channels.filter((channel): channel is string => typeof channel === 'string')
      : [];
    const sessionIds = Array.isArray(payload.sessionIds)
      ? payload.sessionIds.filter((sessionId): sessionId is number => typeof sessionId === 'number')
      : [];

    return {
      channels,
      eventKey,
      sessionIds,
      workspaceKey,
    };
  }
}
