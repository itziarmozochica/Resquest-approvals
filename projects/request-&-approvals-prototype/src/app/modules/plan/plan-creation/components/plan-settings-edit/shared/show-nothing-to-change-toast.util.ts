import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateService } from '@ngx-translate/core';

export function hasPendingChanges(dirtyStates: readonly boolean[]): boolean {
  return dirtyStates.some((isDirty: boolean) => isDirty);
}

export function showNothingToChangeToast(toastService: ToastService, translateService: TranslateService): void {
  toastService.add({
    autoHide: true,
    delay: 3000,
    message: translateService.instant('planEdition.toast.nothingToChange'),
    sentiment: AlertSentiment.info,
  });
}
