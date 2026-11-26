import { inject, Injectable } from '@angular/core';

import { CodeScan } from '@fz-original/app/shared/services/webview-messenger/models/code-scan.model';
import { MessageType, WebviewMessengerService } from '@fz-original/app/shared/services/webview-messenger/webview-messenger.service';
import { filter, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScannerDualScreenService {
  #webviewMessengerService = inject(WebviewMessengerService);

  observeScanCode(): Observable<string> {
    return this.#webviewMessengerService.observe<CodeScan>(MessageType.CodeScan).pipe(
      map((data: CodeScan) => data.code),
      filter((code: string) => Boolean(code?.trim())),
    );
  }
}
