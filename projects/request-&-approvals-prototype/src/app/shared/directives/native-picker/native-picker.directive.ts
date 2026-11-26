import { DestroyRef, Directive, inject } from '@angular/core';
import { outputToObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';

import { TouchKeyboardService } from '../../services/touch-keyboard/touch-keyboard.service';

/**
 * Opens the native picker of a date or time `ignt-input-field`: from its trail icon on every device, and from a tap
 * on the field on a touch screen. Some Android WebViews (the dual-screen POS, GAME-1688) focus a time input on tap
 * without opening its dialog, and the design system hides the browser's own picker icon, so without this the field
 * cannot be filled there. On a desktop a click keeps placing the caret, so the time stays typeable.
 */
@Directive({
  host: {
    '(click)': 'onFieldClick($event)',
  },
  selector: 'ignt-input-field[appNativePicker]',
})
export class NativePickerDirective {
  readonly #field = inject(IgntInputFieldComponent);
  readonly #touchKeyboardService = inject(TouchKeyboardService);

  constructor() {
    // A host listener cannot bind the output of the component it sits on, so it is read as an observable instead.
    outputToObservable(this.#field.trailIconClicked)
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.#openPicker());
  }

  protected onFieldClick(event: MouseEvent): void {
    // The trail icon is a button with its own output, read in the constructor: answering its click too would open twice.
    const isFromButton = event.target instanceof Element && event.target.closest('button') !== null;

    if (!isFromButton && this.#touchKeyboardService.hasOnScreenKeyboard()) {
      this.#openPicker();
    }
  }

  #openPicker(): void {
    try {
      this.#field.inputElement?.nativeElement?.showPicker?.();
    } catch {
      // showPicker throws outside a user gesture or on a disabled field; the field stays usable by typing.
    }
  }
}
