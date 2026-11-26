import { inject, Injector } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

import { confirmDiscardUnsavedChanges } from '@fz-original/app/shared/guard/has-unsaved-changes/unsaved-changes-confirm.util';
import { WithUnsavedChangesGuardComponent } from '@fz-original/app/shared/models/with-unsaved-changes-guard-component.model';
import { IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export const contentPlanUnsavedChangesGuard: CanDeactivateFn<WithUnsavedChangesGuardComponent | null> = async component => {
  if (!component) {
    return true;
  }

  if (component.shouldBypassUnsavedChangesGuard?.() === true) {
    return true;
  }

  if (!component.areChangesUnsaved()) {
    return true;
  }

  const dialogService = inject(IgntDialogService);
  const translateService = inject(TranslateService);
  const injector = inject(Injector);

  const shouldNavigate = await firstValueFrom(confirmDiscardUnsavedChanges(dialogService, translateService, injector));

  if (shouldNavigate !== true) {
    component.cancelFunction?.();
    return false;
  }

  const acceptResult = component.acceptFunction?.();
  if (acceptResult && typeof acceptResult.subscribe === 'function') {
    await firstValueFrom(acceptResult);
  }
  return true;
};
