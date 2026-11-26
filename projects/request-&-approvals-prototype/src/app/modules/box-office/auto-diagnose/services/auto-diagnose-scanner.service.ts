import { DOCUMENT, inject, Injectable } from '@angular/core';

import { ScannerService } from '@fz-original/app/app/services/scanner/scanner.service';
import { filter, fromEvent, map, merge, Observable } from 'rxjs';

import { ScannerInputEvent, ScannerInputSource } from '../models/scanner-diagnose.model';

@Injectable({ providedIn: 'root' })
export class AutoDiagnoseScannerService {
  readonly #document = inject(DOCUMENT);
  readonly #scannerService = inject(ScannerService);

  /**
   * Scans the Android app broadcasts plus the characters a keyboard-wedge scanner types into the page.
   * Navigation, modifier and whitespace keys (Tab, Escape, Shift, Enter, Space) and shortcuts are left out:
   * they move focus or press buttons, and are never part of a test code.
   */
  observeInput$(): Observable<ScannerInputEvent> {
    const broadcast$: Observable<ScannerInputEvent> = this.#scannerService
      .observeScanCode()
      .pipe(map((code: string) => this.#event(ScannerInputSource.broadcast, code)));
    const keyboard$: Observable<ScannerInputEvent> = fromEvent<KeyboardEvent>(this.#document, 'keydown', { capture: true }).pipe(
      filter(isCodeCharacter),
      map((event: KeyboardEvent) => this.#event(ScannerInputSource.keyboard, event.key)),
    );

    return merge(broadcast$, keyboard$);
  }

  #event(source: ScannerInputSource, value: string): ScannerInputEvent {
    return { at: performance.now(), source, value };
  }
}

function isCodeCharacter(event: KeyboardEvent): boolean {
  return event.key.length === 1 && event.key.trim() !== '' && !event.ctrlKey && !event.metaKey && !event.altKey;
}
