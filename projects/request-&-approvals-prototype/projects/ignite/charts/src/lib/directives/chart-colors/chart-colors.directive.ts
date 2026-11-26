import { Directive, Type } from '@angular/core';

interface ChartColorOption {
  readonly area: string;
  readonly bar: string;
  readonly line: string;
}

@Directive({
  standalone: true,
})
export class IgntChartColorsDirective {
  static readonly colors = {
    basic: { area: '#7d8e98', bar: '#7d8e98', line: '#2c4751' },
    brown: { area: '#f47556', bar: '#f47556', line: '#cf4825' },
    gold: { area: '#c5af00', bar: '#c5af00', line: '#a39001' },
    green: { area: '#57bc35', bar: '#57bc35', line: '#429127' },
    lilac: { area: '#ce74f3', bar: '#ce74f3', line: '#b032de' },
    pink: { area: '#f46a9c', bar: '#f46a9c', line: '#d42f77' },
    purple: { area: '#9295f3', bar: '#9295f3', line: '#6c63ee' },
    turquoise: { area: '#3ab0d0', bar: '#3ab0d0', line: '#2c88a1' },
  } as const satisfies Record<string, ChartColorOption>;

  static readonly colorPriority: (keyof typeof IgntChartColorsDirective.colors)[] = [
    'basic',
    'purple',
    'turquoise',
    'lilac',
    'pink',
    'green',
    'gold',
    'brown',
  ];

  /**
   * Returns the resolved color for a given series index and variant.
   * Colors are assigned from the priority palette and wrap around using modulo.
   * `'bar'` is a semantic alias for `'area'` and resolves to the same color.
   */
  resolveColor(index: number, variant: 'area' | 'bar' | 'line'): string | undefined {
    const colorKey = IgntChartColorsDirective.colorPriority[index % IgntChartColorsDirective.colorPriority.length];

    return IgntChartColorsDirective.colors[colorKey][variant];
  }

  /**
   * Returns an array of rgba colors with varying opacities for gradient effects.
   * Useful for heatmaps and other visualizations that need opacity-based gradients.
   */
  resolveGradientColors(index: number, variant: 'area' | 'line', opacities: readonly number[]): string[] {
    const baseColor = this.resolveColor(index, variant) ?? IgntChartColorsDirective.colors.basic[variant];

    return opacities.map(opacity => this.#hexToRgba(baseColor, opacity));
  }

  /**
   * Returns the resolved color for a series within a multi-series chart, using the convention
   * shared by line-style charts (area, bar/line combo): a single series uses the basic palette
   * entry, while multi-series charts skip basic and wrap through the non-basic palette only.
   *
   * Use this instead of {@link resolveColor} when the chart treats the basic color as a
   * "single-series" accent that should not collide with palette colors when more series appear.
   *
   * @param index Zero-based index of the current series in the series array.
   * @param total Total number of series in the chart.
   * @param variant Color variant to resolve (`'area'`, `'bar'`, or `'line'`).
   */
  resolveSeriesColor(index: number, total: number, variant: 'area' | 'bar' | 'line'): string | undefined {
    if (total === 1) {
      return this.resolveColor(0, variant);
    }

    const nonBasicPaletteSize = IgntChartColorsDirective.colorPriority.length - 1;
    const colorIndex = (index % nonBasicPaletteSize) + 1;

    return this.resolveColor(colorIndex, variant);
  }

  #hexToRgba(hex: string, opacity: number): string {
    const red = parseInt(hex.slice(1, 3), 16);
    const green = parseInt(hex.slice(3, 5), 16);
    const blue = parseInt(hex.slice(5, 7), 16);

    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
  }
}

export function withIgntChartColors(): {
  directive: Type<IgntChartColorsDirective>;
  inputs: string[];
  outputs: string[];
} {
  return {
    directive: IgntChartColorsDirective,
    inputs: [],
    outputs: [],
  };
}
