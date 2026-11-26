import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  QueryList,
  signal,
  viewChildren,
  WritableSignal,
} from '@angular/core';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';

import {
  focusDigitInput,
  handleDigitInput,
  handleDigitPaste,
  manageCodeInputInteraction,
} from '../../../modules/user/shared/utils/digit-input.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FaIconComponent, TranslateModule],
  selector: 'app-digit-input',
  standalone: true,
  styleUrls: ['./digit-input.component.scss'],
  templateUrl: './digit-input.component.html',
})
export class DigitInputComponent implements AfterViewInit, OnDestroy {
  #changeDetectorRef = inject(ChangeDetectorRef);
  #maskTimers: NodeJS.Timeout[] = [];
  #resetTimer: NodeJS.Timeout | null = null;

  digitInputs = viewChildren<ElementRef<HTMLInputElement>>('digitInput');

  digitLength = input<number>(4);
  showToggleVisibility = input<boolean>(false);
  pinComplete = output<string>();
  valueChange = output<string>();

  focusedIndex: WritableSignal<number> = signal<number>(0);
  isVisible: WritableSignal<boolean> = signal<boolean>(false);
  values: WritableSignal<string[]> = signal<string[]>([]);

  constructor() {
    this.values.set(Array(this.digitLength()).fill(''));
  }

  getInputArray(): number[] {
    return Array.from({ length: this.digitLength() }, (_, i) => i);
  }

  ngAfterViewInit(): void {
    this.#focusFirstInput();
  }

  ngOnDestroy(): void {
    this.#maskTimers.forEach(timer => clearTimeout(timer));
    this.#maskTimers = [];
    if (this.#resetTimer) {
      clearTimeout(this.#resetTimer);
      this.#resetTimer = null;
    }
  }

  onDigitInput(event: Event, index: number): void {
    const queryList = this.#getQueryList();
    handleDigitInput(event, index, queryList, () => {
      this.#updateValueFromInputs();
      this.#maskDigitIfNeeded(index);
      this.#changeDetectorRef.markForCheck();
    });
    this.#updateValueFromInputs();
    this.#maskDigitIfNeeded(index);
    const currentValue = this.#getValue();
    this.valueChange.emit(currentValue);
    if (currentValue.length === this.digitLength()) {
      this.pinComplete.emit(currentValue);
    }
    this.#changeDetectorRef.markForCheck();
  }

  onFocus(index: number): void {
    this.focusedIndex.set(index);
    this.#changeDetectorRef.markForCheck();
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    const valueBefore = this.#getValue();
    const queryList = this.#getQueryList();
    manageCodeInputInteraction(event, index, queryList, () => {
      this.#updateValueFromInputs();
      this.#changeDetectorRef.markForCheck();
    });
    this.#updateValueFromInputs();
    const valueAfter = this.#getValue();
    if (valueAfter !== valueBefore) {
      this.valueChange.emit(valueAfter);
    }
    this.#changeDetectorRef.markForCheck();
  }

  onPaste(event: ClipboardEvent, index: number): void {
    handleDigitPaste(event, index, this.#getQueryList(), () => {
      this.#updateValueFromInputs();
      this.getInputArray().forEach(digitIndex => this.#maskDigitIfNeeded(digitIndex));
      const currentValue = this.#getValue();
      this.valueChange.emit(currentValue);
      if (currentValue.length === this.digitLength()) {
        this.pinComplete.emit(currentValue);
      }
    });
  }

  reset(): void {
    const inputs = this.digitInputs();
    inputs.forEach((input: ElementRef<HTMLInputElement>) => {
      input.nativeElement.value = '';
    });
    this.values.set(Array(this.digitLength()).fill(''));
    this.focusedIndex.set(0);
    this.isVisible.set(false);
    this.#changeDetectorRef.markForCheck();
    if (this.#resetTimer) {
      clearTimeout(this.#resetTimer);
    }
    this.#resetTimer = setTimeout(() => {
      this.#focusFirstInput();
    }, 0);
  }

  toggleVisibility(): void {
    const wasVisible = this.isVisible();
    this.isVisible.update(value => !value);
    const inputs = this.digitInputs();
    const values = this.values();
    inputs.forEach((input: ElementRef<HTMLInputElement>, index: number) => {
      const realValue = values[index] || '';
      if (realValue) {
        if (wasVisible) {
          input.nativeElement.value = '*';
        } else {
          input.nativeElement.value = realValue;
        }
      }
    });
    this.#changeDetectorRef.markForCheck();
  }

  #focusFirstInput(): void {
    const inputs = this.digitInputs();
    if (inputs.length > 0) {
      focusDigitInput([...inputs], 0);
    }
  }

  #getQueryList(): QueryList<ElementRef<HTMLInputElement>> | undefined {
    const inputs = this.digitInputs();
    if (inputs.length === 0) {
      return undefined;
    }
    return {
      length: inputs.length,
      toArray: () => inputs,
    } as unknown as QueryList<ElementRef<HTMLInputElement>>;
  }

  #getValue(): string {
    return this.values().join('');
  }

  #maskDigitIfNeeded(index: number): void {
    if (this.showToggleVisibility() && !this.isVisible()) {
      const inputs = this.digitInputs();
      const input = inputs[index];
      const values = this.values();
      if (input && values[index] && values[index] !== '*') {
        if (this.#maskTimers[index]) {
          clearTimeout(this.#maskTimers[index]);
        }
        this.#maskTimers[index] = setTimeout(() => {
          const currentValues = this.values();
          if (!this.isVisible() && currentValues[index] && currentValues[index] !== '*') {
            input.nativeElement.value = '*';
            this.#changeDetectorRef.markForCheck();
          }
        }, 500);
      }
    }
  }

  #updateValueFromInputs(): void {
    const inputs = this.digitInputs();
    const currentValues = this.values();
    const newValues = inputs.map((input: ElementRef<HTMLInputElement>, index: number) => {
      const inputValue = input.nativeElement.value || '';
      if (inputValue === '*') {
        return currentValues[index] || '';
      }
      return inputValue;
    });
    this.values.set(newValues);
    this.#changeDetectorRef.markForCheck();
  }
}
