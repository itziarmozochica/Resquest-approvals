import { Step } from '@ignite/legacy/components/ignt-stepper/ignt.stepper.model';
import { TranslateService } from '@ngx-translate/core';

export interface PlanStepperConfig {
  includeContent?: boolean;
  includeEventSettings?: boolean;
  includeInventorySetup?: boolean;
  contentStatus?: Step['status'];
  eventSettingsStatus?: Step['status'];
  inventorySetupStatus?: Step['status'];
}

export function createPlanStepperSteps(translateService: TranslateService, config: PlanStepperConfig = {}): Step[] {
  const {
    includeContent = true,
    includeEventSettings = true,
    includeInventorySetup = false,
    contentStatus = 'active',
    eventSettingsStatus = 'inactive',
    inventorySetupStatus = 'inactive',
  } = config;

  const steps: Step[] = [];

  if (includeContent) {
    steps.push({
      id: 'content',
      label: translateService.instant('planEdition.stepper.content'),
      status: contentStatus,
    });
  }

  if (includeEventSettings) {
    steps.push({
      id: 'settings',
      label: translateService.instant('planEdition.stepper.eventSettings'),
      status: eventSettingsStatus,
    });
  }

  if (includeInventorySetup) {
    steps.push({
      id: 'inventory-setup',
      label: translateService.instant('planEdition.stepper.inventorySetup'),
      status: inventorySetupStatus,
    });
  }

  return steps;
}
