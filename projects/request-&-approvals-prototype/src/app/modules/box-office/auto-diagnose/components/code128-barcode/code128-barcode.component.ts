import { ChangeDetectionStrategy, Component, computed, input, Signal } from '@angular/core';

import { Code128Fnc3, Code128Symbol } from '../../models/code128.model';
import { encodeCode128 } from '../../utils/code128.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-code128-barcode',
  styleUrl: './code128-barcode.component.scss',
  templateUrl: './code128-barcode.component.html',
})
export class Code128BarcodeComponent {
  static readonly barHeightModules = 60;

  readonly ariaLabel = input.required<string>();
  readonly value = input.required<string>();
  readonly fnc3 = input<Code128Fnc3>(Code128Fnc3.none);

  protected readonly barHeight: number = Code128BarcodeComponent.barHeightModules;
  protected readonly symbol: Signal<Code128Symbol> = computed(() => encodeCode128(this.value(), this.fnc3()));
  protected readonly viewBox: Signal<string> = computed(
    () => `0 0 ${this.symbol().totalModules} ${Code128BarcodeComponent.barHeightModules}`,
  );
}
