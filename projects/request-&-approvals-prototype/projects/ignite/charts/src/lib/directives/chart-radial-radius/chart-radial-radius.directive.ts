import { computed, Directive, inject, input, InputSignal, Signal, Type } from '@angular/core';

import type { IgntChartRadialRadiusPercent } from '../../models/chart-radial-radius.model';
import { IGNT_CHART_RADIAL_RADIUS_DEFAULT } from './chart-radial-radius.token';
import { resolveIgntChartRadialExtent } from './chart-radial-radius.util';

/**
 * Radial size as percent of chart area.
 * Default outer for a full disc when no token: {@link IgntChartRadialRadiusDirective.defaultRadius}.
 */
@Directive({
  standalone: true,
})
export class IgntChartRadialRadiusDirective {
  /** Default when `radius` is unset and no {@link IGNT_CHART_RADIAL_RADIUS_DEFAULT} (full disc outer %). */
  static readonly defaultRadius = 70;

  readonly #defaultFromHost = inject(IGNT_CHART_RADIAL_RADIUS_DEFAULT, { optional: true });

  radius: InputSignal<IgntChartRadialRadiusPercent | undefined> = input<IgntChartRadialRadiusPercent | undefined>(undefined);

  readonly radialExtent: Signal<string | [string, string]> = computed(() =>
    resolveIgntChartRadialExtent(this.radius() ?? this.#defaultFromHost ?? IgntChartRadialRadiusDirective.defaultRadius),
  );
}

export function withIgntChartRadialRadius(): {
  directive: Type<IgntChartRadialRadiusDirective>;
  inputs: string[];
  outputs: string[];
} {
  return {
    directive: IgntChartRadialRadiusDirective,
    inputs: ['radius'],
    outputs: [],
  };
}
