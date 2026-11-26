import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  Output,
  signal,
  WritableSignal,
} from '@angular/core';

import Seatsio from '@seatsio/seatsio-types';

import { CartSession } from '../../models/cart/cart-session.model';
import { SeatingInformation, SeatingMapConfig } from './seating-modal.model';

export { type SeatingInformation, type SeatingMapConfig } from './seating-modal.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-invitations-seating',
  standalone: false,
  styleUrls: ['./seating-modal.component.scss'],
  templateUrl: './seating-modal.component.html',
})
export class SeatingModalComponent implements OnDestroy {
  #cd = inject(ChangeDetectorRef);
  #chart: Seatsio.EventManager | null = null;
  #mapConfig: SeatingMapConfig | null = null;
  #renderTimeout: ReturnType<typeof setTimeout> | null = null;
  #sessionsSeats: SeatingInformation[] = [];
  @Output() closeEmitter = new EventEmitter<void>();
  @Input() highlightedSeats: string[] = [];
  readonly collapsedSessions: WritableSignal<Set<number>> = signal<Set<number>>(new Set<number>());

  close(): void {
    this.closeEmitter.emit();
  }

  get mapConfig(): SeatingMapConfig | null {
    return this.#mapConfig;
  }

  @Input()
  set mapConfig(value: SeatingMapConfig | null) {
    this.#mapConfig = value;
    if (value) {
      this.#renderTimeout = setTimeout(() => this.#renderChart());
    }
    this.#cd.markForCheck();
  }

  ngOnDestroy(): void {
    if (this.#renderTimeout) {
      clearTimeout(this.#renderTimeout);
      this.#renderTimeout = null;
    }
    if (this.#chart) {
      this.#chart.destroy();
      this.#chart = null;
    }
  }

  get sessionsSeats(): SeatingInformation[] {
    return this.#sessionsSeats;
  }

  @Input()
  set sessionsSeats(value: SeatingInformation[]) {
    this.#sessionsSeats = value;
    this.collapsedSessions.set(new Set(value.map((_: SeatingInformation, index: number) => index)));
    this.#cd.markForCheck();
  }

  toggleSession(index: number): void {
    this.collapsedSessions.update((prev: Set<number>) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  trackBySession(_: number, session: CartSession): number {
    return session.sessionId;
  }

  #renderChart(): void {
    const seatsio = window['seatsio'] as Seatsio.Seatsio | undefined;
    if (!seatsio || !this.#mapConfig) {
      return;
    }

    if (this.#chart) {
      this.#chart.destroy();
      this.#chart = null;
    }

    const highlighted = this.highlightedSeats;

    this.#chart = new seatsio.EventManager({
      divId: 'seating-modal-chart',
      event: this.#mapConfig.eventKey,
      extraConfig: { highlightedSeats: highlighted },
      maxSelectedObjects: 0,
      mode: 'select',
      secretKey: this.#mapConfig.secretKey,
      objectColor: (object: Seatsio.SelectableObject, defaultColor: string, extraConfig: Seatsio.ExtraConfig): string => {
        const cfg = extraConfig as { highlightedSeats: string[] };
        const seatLabel = object.label ?? '';

        if (cfg.highlightedSeats.includes(seatLabel)) {
          const catColor = (object as unknown as { category?: { color?: string } }).category?.color ?? '';
          const clean = catColor.replace('#', '');
          if (clean.length === 6) {
            const r = parseInt(clean.substring(0, 2), 16);
            const b = parseInt(clean.substring(4, 6), 16);
            if (b > r && b > 100) {
              // kind of blue color
              return '#FF6D00';
            }
          }
          return '#1976D2';
        }
        return defaultColor;
      },
      objectIcon: (object: Seatsio.SelectableObject, defaultIcon: string | null, extraConfig?: Seatsio.ExtraConfig): string => {
        const cfg = extraConfig as { highlightedSeats?: string[] } | undefined;
        const seatLabel = object.label ?? '';

        if (cfg?.highlightedSeats?.includes(seatLabel)) {
          return 'user-circle';
        }
        return defaultIcon ?? '';
      },
      onChartRendered: (chart: Seatsio.EventManager) => {
        if (highlighted.length > 0) {
          chart.zoomToObjects(highlighted);
        }
      },
    } as Seatsio.EventManagerSelectModeConfigOptions);

    this.#chart.render();
  }
}
