import { ChangeDetectionStrategy, Component, input, InputSignal, output, OutputEmitterRef, Signal, signal } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent],
  selector: 'app-pin-pad',
  styleUrl: './pin-pad.component.scss',
  templateUrl: './pin-pad.component.html',
})
export class PinPadComponent {
  readonly #pressedKey = signal<string | null>(null);
  readonly backspaceKey = 'backspace';
  errorMessage: InputSignal<string | null> = input<string | null>(null);
  isLoading: InputSignal<boolean> = input<boolean>(false);
  pin = '';
  pinLength: InputSignal<number> = input<number>(4);
  pinChange: OutputEmitterRef<string> = output<string>();
  pinComplete: OutputEmitterRef<string> = output<string>();
  readonly digits: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  readonly pressedKey: Signal<string | null> = this.#pressedKey.asReadonly();

  getDotsArray(): number[] {
    return Array.from({ length: this.pinLength() }, (_, i) => i);
  }

  onBackspace(): void {
    if (this.isLoading()) {
      return;
    }
    if (this.pin.length > 0) {
      this.pin = this.pin.slice(0, -1);
      this.pinChange.emit(this.pin);
    }
  }

  onDigitClick(digit: string): void {
    if (this.isLoading()) {
      return;
    }
    if (this.pin.length < this.pinLength()) {
      this.pin += digit;
      this.pinChange.emit(this.pin);
      if (this.pin.length === this.pinLength()) {
        this.pinComplete.emit(this.pin);
      }
    }
  }

  onKeyClick(event: MouseEvent, key: string): void {
    if (event.detail !== 0) {
      return;
    }
    this.#type(key);
  }

  onKeyPointerDown(event: PointerEvent, key: string): void {
    if (event.button !== 0 || this.isLoading()) {
      return;
    }
    this.#pressedKey.set(key);
    this.#type(key);
  }

  onKeyPointerEnd(): void {
    this.#pressedKey.set(null);
  }

  reset(): void {
    this.#pressedKey.set(null);
    this.pin = '';
    this.pinChange.emit(this.pin);
  }

  #type(key: string): void {
    if (key === this.backspaceKey) {
      this.onBackspace();
    } else {
      this.onDigitClick(key);
    }
  }
}
