import { inject, Injector, signal } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

import { IGNT_DIALOG_TRANSLATIONS, IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { WithUnsavedChangesGuardComponent } from '../../models/with-unsaved-changes-guard-component.model';

export const hasUnsavedChangesGuard: CanDeactivateFn<WithUnsavedChangesGuardComponent> = async component => {
  if (component.shouldBypassUnsavedChangesGuard?.() === true) {
    return true;
  }

  if (!component.areChangesUnsaved()) {
    return true;
  }

  const dialogService = inject(IgntDialogService);
  const translateService = inject(TranslateService);

  const config = component.unsavedChangesModalConfig || {};
  const swapModalActions = config.swapModalActions ?? false;

  const dialogInjectorWithTranslations = Injector.create({
    parent: inject(Injector),
    providers: [
      {
        multi: true,
        provide: IGNT_DIALOG_TRANSLATIONS,
        useFactory: () =>
          signal({
            cancelButton: translateService.instant(config.keepEditingButtonKey ?? 'common.unsavedChanges.cancel'),
            okButton: translateService.instant(config.discardButtonKey ?? 'common.unsavedChanges.confirm'),
          }),
      },
    ],
  });

  const confirmed = await firstValueFrom(
    dialogService.openConfirmModal(
      translateService.instant(config.titleKey ?? 'common.unsavedChanges.title'),
      translateService.instant(config.messageKey ?? 'common.unsavedChanges.message'),
      { injector: dialogInjectorWithTranslations, isDestructive: config.showDangerAcceptButton ?? true },
    ).closed$,
  );

  // An undefined result means the application closed the dialog (closeAll on session expiry), not
  // an answer: no hook runs and the navigation is cancelled, as the legacy rejected promise did.
  if (confirmed === undefined) {
    return false;
  }

  // The accept button is always the discard action. In the swapped configuration (reservation
  // checkout) accepting keeps the user on the page, so navigation follows the inverted result.
  const shouldNavigate = swapModalActions ? !confirmed : confirmed;

  if (confirmed) {
    component.onUnsavedChangesDiscarded?.();
  }

  if (!shouldNavigate) {
    component.cancelFunction?.();
    return false;
  }

  const acceptResult = component.acceptFunction?.();
  if (acceptResult && typeof acceptResult.subscribe === 'function') {
    await firstValueFrom(acceptResult);
  }

  return true;
};
