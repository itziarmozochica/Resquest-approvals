import { Injector } from '@angular/core';

import { openConfirmModalWithLabels } from '@fz-original/app/modules/content-plan/utils/open-confirm-modal-with-labels.util';
import { IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

export interface UnsavedChangesConfirmCopy {
  acceptKey?: string;
  cancelKey?: string;
  isDestructive?: boolean;
  messageKey?: string;
  messageParams?: Record<string, string>;
  titleKey?: string;
}

export function confirmDiscardUnsavedChanges(
  dialogService: IgntDialogService,
  translateService: TranslateService,
  parentInjector: Injector,
  copy: UnsavedChangesConfirmCopy = {},
): Observable<boolean | undefined> {
  return openConfirmModalWithLabels(dialogService, parentInjector, {
    cancelButton: translateService.instant(copy.cancelKey ?? 'common.unsavedChanges.cancel'),
    isDestructive: copy.isDestructive ?? true,
    message: translateService.instant(copy.messageKey ?? 'common.unsavedChanges.message'),
    okButton: translateService.instant(copy.acceptKey ?? 'common.unsavedChanges.confirm'),
    title: translateService.instant(copy.titleKey ?? 'common.unsavedChanges.title'),
  }).closed$;
}
