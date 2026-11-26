import { Injector } from '@angular/core';

import { IgntDialogService, type IgntDialogRef } from '@ignite/common';

import { CreateEventQuickSetupWizardComponent } from './create-event-quick-setup-wizard.component';
import { CreateEventQuickSetupWizardCloseResult, CreateEventQuickSetupWizardData } from './create-event-quick-setup-wizard.model';

export function openCreateEventQuickSetupWizard(
  dialogService: IgntDialogService,
  injector: Injector,
  data: CreateEventQuickSetupWizardData,
): IgntDialogRef<CreateEventQuickSetupWizardCloseResult | null> {
  return dialogService.openModal<CreateEventQuickSetupWizardCloseResult | null>(CreateEventQuickSetupWizardComponent, {
    data,
    disableCloseShortcuts: true,
    injector,
    size: 'lg',
  });
}
