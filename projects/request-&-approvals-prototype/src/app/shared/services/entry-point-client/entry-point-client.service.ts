import { inject, Injectable, signal, type Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EntryPointClient } from '@fz-original/app/app/enums/entry-point-client.enum';
import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { STORAGE_SERVICE } from '@fz/storage';

import { DualScreenStorageService } from '../dual-screen/dual-screen-storage.service';
import { MessageType, WebviewMessengerService } from '../webview-messenger/webview-messenger.service';
import { AppConfigMessageContent } from './app-config-message.model';
import { toEntryPointClient } from './to-entry-point-client.util';

/**
 * Which client the native kiosk app opened first: Feverzone itself (Box Office) or Odoo (Fever POS for Funlab).
 *
 * The app writes it twice. The `dual-screen` storage seed only lands on the origin the webview opened first,
 * which in the Funlab build is Odoo, so Feverzone reached later through the Odoo hand-off never sees it. The
 * `appConfig` bridge message runs on every handshake and is what reaches Feverzone there; it is persisted so a
 * reload before the next handshake still knows. Outside the kiosk app neither exists and the answer is Feverzone.
 */
@Injectable({
  providedIn: 'root',
})
export class EntryPointClientService {
  readonly #dualScreenStorageService = inject(DualScreenStorageService);
  readonly #storage = inject(STORAGE_SERVICE);
  readonly #webviewMessenger = inject(WebviewMessengerService);
  readonly #entryPointClient = signal<EntryPointClient>(this.#readStoredEntryPointClient());

  /** The current entry point, read by the logout chain and by templates that switch with it. */
  readonly entryPointClient: Signal<EntryPointClient> = this.#entryPointClient.asReadonly();

  constructor() {
    this.#webviewMessenger
      .observe<AppConfigMessageContent | null>(MessageType.AppConfig, { includeUnconsumed: true })
      .pipe(takeUntilDestroyed())
      .subscribe((content: AppConfigMessageContent | null) => {
        const entryPointClient = toEntryPointClient(content?.entryPointClient);
        if (entryPointClient !== null) {
          this.#storage.set(StorageKey.entryPointClient, entryPointClient);
          this.#entryPointClient.set(entryPointClient);
        }
      });
  }

  #readStoredEntryPointClient(): EntryPointClient {
    return (
      toEntryPointClient(this.#storage.get(StorageKey.entryPointClient)) ??
      toEntryPointClient(this.#dualScreenStorageService.getData()?.entryPointClient) ??
      EntryPointClient.Feverzoneclient
    );
  }
}
