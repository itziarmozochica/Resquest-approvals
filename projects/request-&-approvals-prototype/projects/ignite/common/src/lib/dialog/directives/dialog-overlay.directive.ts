import { DOCUMENT } from '@angular/common';
import { Directive, inject, output, OutputEmitterRef, Type } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IGNT_DIALOG_OVERLAY } from '../models/dialog-host';

@Directive({
  standalone: true,
})
export class IgntDialogOverlayDirective {
  readonly #overlayRef = inject(IGNT_DIALOG_OVERLAY);
  readonly backdropClick: OutputEmitterRef<void> = output();
  readonly escapeKeyPress: OutputEmitterRef<void> = output();
  readonly #documentRef = inject(DOCUMENT);
  readonly #triggerElement: HTMLElement | null = this.#documentRef.activeElement as HTMLElement;

  constructor() {
    this.#overlayRef
      .backdropClick()
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.backdropClick.emit();
      });

    this.#overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed())
      .subscribe(event => {
        if (event.key === 'Escape' && !event.defaultPrevented) {
          this.escapeKeyPress.emit();
        }
      });
  }

  close(): void {
    // Restore focus to the trigger element
    if (this.#triggerElement !== null) {
      this.#triggerElement.focus({ preventScroll: true });
    }
    this.#overlayRef.dispose();
  }
}

export function withIgntDialogOverlay(): {
  directive: Type<IgntDialogOverlayDirective>;
  inputs: string[];
  outputs: string[];
} {
  return {
    directive: IgntDialogOverlayDirective,
    inputs: [],
    outputs: [],
  };
}
