import { CurrencyPipe, getNumberOfCurrencyDigits } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Reusable ATM-style numeric keypad: each digit shifts the value left one decimal position and
 * backspace shifts it right, always keeping a full fixed-decimal amount (type `1`, `2`, `5` on a
 * two-decimal currency and the value goes 0.01 → 0.12 → 1.25). The number of decimal positions is
 * derived from the currency.
 *
 * Dumb by design: it owns only the entry buffer and emits `valueChange` in major units. Bounds
 * beyond `maxAmount` (minimums, business rules) belong to the host: a press rejected by
 * `maxAmount` emits `limitExceeded`, and the host renders its own copy through `errorMessage`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)',
    '[class.numeric-keypad--calculator]': 'appearance() === "calculator"',
    tabindex: '-1',
  },
  imports: [CurrencyPipe, IgntIconComponent, TranslateModule],
  selector: 'app-numeric-keypad',
  standalone: true,
  styleUrl: './numeric-keypad.component.scss',
  templateUrl: './numeric-keypad.component.html',
})
export class NumericKeypadComponent {
  appearance: InputSignal<'calculator' | 'default'> = input<'calculator' | 'default'>('default');
  /** Grabs keyboard focus on entry so typing works immediately; disable for embedded/secondary uses. */
  autoFocus: InputSignal<boolean> = input<boolean>(true);
  currency: InputSignal<string> = input<string>('EUR');
  disabled: InputSignal<boolean> = input<boolean>(false);
  /** Already-translated validation message rendered under the amount (the host owns the copy). */
  errorMessage: InputSignal<string | null> = input<string | null>(null);
  locale: InputSignal<string> = input<string>('en-US');
  /** Upper bound in major units; digits that would exceed it are ignored (ATM-style). */
  maxAmount: InputSignal<number | null> = input<number | null>(null);
  /** Hides the built-in amount readout when the host renders the value itself (e.g. field inputs). */
  showDisplay: InputSignal<boolean> = input<boolean>(true);
  /** Current value in major units (e.g. 12.34). Reset it to 0 to clear the keypad. */
  value: InputSignal<number> = input<number>(0);
  /** Emits when a press was ignored because it would exceed `maxAmount`. */
  limitExceeded: OutputEmitterRef<void> = output<void>();
  valueChange: OutputEmitterRef<number> = output<number>();

  protected readonly digits: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #fractionDigits: Signal<number> = computed(() => getNumberOfCurrencyDigits(this.currency()));
  /** Entry buffer in minor units (cents for two-decimal currencies). */
  readonly #buffer = signal<number>(0);

  protected readonly displayAmount: Signal<number> = computed(() => this.#toMajorUnits(this.#buffer()));

  constructor() {
    // Reseed the buffer whenever the host writes `value` (echoes of our own emissions are no-ops).
    effect(() => this.#buffer.set(this.#toBuffer(this.value())));
    afterNextRender(() => {
      if (this.autoFocus() && !this.disabled()) {
        this.#host.nativeElement.focus();
      }
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || this.#isEditableTarget(event.target)) {
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      this.pressBackspace();
      return;
    }
    const digit = this.#digitFromEvent(event);
    if (digit !== null) {
      event.preventDefault();
      this.pressDigit(digit);
    }
  }

  protected pressBackspace(): void {
    if (this.disabled()) {
      return;
    }
    this.#setBuffer(Math.floor(this.#buffer() / 10));
  }

  protected pressDigit(digit: number): void {
    if (this.disabled()) {
      return;
    }
    const candidate = this.#buffer() * 10 + digit;
    if (!this.#fitsLimits(candidate)) {
      this.limitExceeded.emit();
      return;
    }
    this.#setBuffer(candidate);
  }

  #digitFromEvent(event: KeyboardEvent): number | null {
    if (/^[0-9]$/.test(event.key)) {
      return Number(event.key);
    }
    if (event.key.length !== 1 && /^(Digit|Numpad)[0-9]$/.test(event.code)) {
      return Number(event.code.slice(-1));
    }
    return null;
  }

  #fitsLimits(buffer: number): boolean {
    if (!Number.isSafeInteger(buffer)) {
      return false;
    }
    const maxAmount = this.maxAmount();
    if (maxAmount !== null && buffer > Math.round(maxAmount * 10 ** this.#fractionDigits())) {
      return false;
    }
    return true;
  }

  #isEditableTarget(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    );
  }

  #setBuffer(buffer: number): void {
    if (buffer === this.#buffer()) {
      return;
    }
    this.#buffer.set(buffer);
    this.valueChange.emit(this.#toMajorUnits(buffer));
  }

  #toBuffer(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }
    return Math.round(value * 10 ** this.#fractionDigits());
  }

  #toMajorUnits(buffer: number): number {
    return buffer / 10 ** this.#fractionDigits();
  }
}
