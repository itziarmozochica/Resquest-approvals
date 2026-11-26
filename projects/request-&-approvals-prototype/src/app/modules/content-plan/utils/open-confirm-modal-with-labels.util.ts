import { Injector, signal } from '@angular/core';

import { IGNT_DIALOG_TRANSLATIONS, IgntDialogRef, IgntDialogService, type IgntDialogTranslations } from '@ignite/common';

export interface ConfirmModalWithLabelsParams {
  cancelButton: string;
  message: string;
  okButton: string;
  title: string;
  isDestructive?: boolean;
}

export function openConfirmModalWithLabels(
  dialogService: IgntDialogService,
  parentInjector: Injector,
  params: ConfirmModalWithLabelsParams,
): IgntDialogRef<boolean> {
  const translations: Partial<IgntDialogTranslations> = { cancelButton: params.cancelButton, okButton: params.okButton };
  return dialogService.openConfirmModal(params.title, params.message, {
    injector: Injector.create({
      parent: parentInjector,
      providers: [{ provide: IGNT_DIALOG_TRANSLATIONS, useValue: signal(translations) }],
    }),
    isDestructive: params.isDestructive,
  });
}
