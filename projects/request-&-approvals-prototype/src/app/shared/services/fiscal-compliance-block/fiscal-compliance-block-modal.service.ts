import { inject, Injectable, Injector, signal } from '@angular/core';

import { IGNT_DIALOG_TRANSLATIONS, IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';

import { findFiscalComplianceBlockCode, FiscalComplianceBlockCode, fiscalComplianceBlockCopies } from './fiscal-compliance-block-code';

@Injectable({
  providedIn: 'root',
})
export class FiscalComplianceBlockModalService {
  readonly #dialogService = inject(IgntDialogService);
  readonly #injector = inject(Injector);
  readonly #translate = inject(TranslateService);

  /** Opens the compliance modal for a caller that already identified the blocking code. */
  open(code: FiscalComplianceBlockCode, beforeOpen?: () => void): void {
    beforeOpen?.();
    const { messageKey, titleKey } = fiscalComplianceBlockCopies[code];
    const okButton = this.#translate.instant('common.accept');
    this.#dialogService.openMessageModal(this.#translate.instant(titleKey), this.#translate.instant(messageKey), {
      injector: Injector.create({
        parent: this.#injector,
        providers: [{ provide: IGNT_DIALOG_TRANSLATIONS, useValue: signal({ okButton }) }],
      }),
    });
  }

  openIfNeeded(error: unknown, beforeOpen?: () => void): boolean {
    const code = findFiscalComplianceBlockCode(error);
    if (code === undefined) {
      return false;
    }

    this.open(code, beforeOpen);
    return true;
  }
}
