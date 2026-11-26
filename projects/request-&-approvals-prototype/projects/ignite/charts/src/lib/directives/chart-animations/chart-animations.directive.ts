import { Directive, input, InputSignal, Type } from '@angular/core';

@Directive({
  standalone: true,
})
export class IgntChartAnimationsDirective {
  /** Whether to animate the chart on load and on data change. Default: `true`. */
  animation: InputSignal<boolean> = input<boolean>(true);
}

export function withIgntChartAnimations(): {
  directive: Type<IgntChartAnimationsDirective>;
  inputs: string[];
  outputs: string[];
} {
  return {
    directive: IgntChartAnimationsDirective,
    inputs: ['animation'],
    outputs: [],
  };
}
