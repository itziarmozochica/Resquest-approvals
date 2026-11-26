import { ElementRef, QueryList } from '@angular/core';
import { AbstractControl } from '@angular/forms';

function getInputsArray(codeInputs: QueryList<ElementRef<HTMLInputElement>> | undefined): ElementRef<HTMLInputElement>[] {
  return codeInputs?.toArray() ?? [];
}

function isHTMLInputElement(target: EventTarget | null): target is HTMLInputElement {
  return target instanceof HTMLInputElement;
}

export function manageCodeInputInteraction(
  event: KeyboardEvent,
  index: number,
  codeInputs: QueryList<ElementRef<HTMLInputElement>> | undefined,
  updateCodeCallback: () => void,
): void {
  if (!isHTMLInputElement(event.target)) {
    return;
  }
  const inputs = getInputsArray(codeInputs);
  const maxIndex = inputs.length - 1;

  if (event.key === 'ArrowLeft' && index > 0) {
    event.preventDefault();
    focusDigitInput(inputs, index - 1);
    return;
  }

  if (event.key === 'Backspace') {
    const raw = event.target.value;
    const digitsOnly = raw.replace(/\D/g, '');
    const hasContent = digitsOnly.length > 0 || raw === '*';
    if (!hasContent && index > 0) {
      event.preventDefault();
      focusDigitInput(inputs, index - 1);
    } else if (hasContent) {
      event.preventDefault();
      event.target.value = '';
      updateCodeCallback();
    }
    return;
  }

  if (event.key === 'ArrowRight' && index < maxIndex) {
    event.preventDefault();
    focusDigitInput(inputs, index + 1);
    return;
  }

  if (event.key.length === 1 && !/^\d$/.test(event.key) && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
  }
}

export function handleDigitInput(
  event: Event,
  index: number,
  codeInputs: QueryList<ElementRef<HTMLInputElement>> | undefined,
  updateCodeCallback: () => void,
): void {
  if (!isHTMLInputElement(event.target)) {
    return;
  }
  const target = event.target;
  const value = target.value.replace(/\D/g, '').slice(0, 1);
  target.value = value;

  updateCodeCallback();

  const inputs = getInputsArray(codeInputs);
  const maxIndex = inputs.length - 1;
  if (value && index < maxIndex) {
    focusDigitInput(inputs, index + 1);
  }
  // Virtual keyboards (e.g. Android) often don't fire keydown for Backspace;
  // react to "field became empty" via input event and move focus to previous
  if (value === '' && index > 0) {
    setTimeout(() => focusDigitInput(inputs, index - 1), 0);
  }
}

export function handleDigitPaste(
  event: ClipboardEvent,
  index: number,
  codeInputs: QueryList<ElementRef<HTMLInputElement>> | undefined,
  updateCodeCallback: () => void,
): void {
  event.preventDefault();
  const digits = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '');
  const inputs = getInputsArray(codeInputs);
  if (!digits || !inputs.length) {
    return;
  }
  const startIndex = digits.length >= inputs.length ? 0 : index;
  const pastedDigits = digits.slice(0, inputs.length - startIndex).split('');
  pastedDigits.forEach((digit, offset) => {
    inputs[startIndex + offset].nativeElement.value = digit;
  });

  updateCodeCallback();

  focusDigitInput(inputs, startIndex + pastedDigits.length);
}

export function focusDigitInput(inputs: ElementRef<HTMLInputElement>[], index: number, preventScroll = false): void {
  if (!inputs.length) {
    return;
  }
  const clampedIndex = Math.max(0, Math.min(index, inputs.length - 1));
  const input = inputs[clampedIndex].nativeElement;
  input.focus({ preventScroll });
  input.select();
}

export function updateCodeFromDigits(
  codeInputs: QueryList<ElementRef<HTMLInputElement>> | undefined,
  codeControl: AbstractControl | null,
): void {
  if (!codeControl) {
    return;
  }
  const inputs = getInputsArray(codeInputs);
  const code = inputs.map(input => input.nativeElement.value || '').join('');
  codeControl.setValue(code);
}
