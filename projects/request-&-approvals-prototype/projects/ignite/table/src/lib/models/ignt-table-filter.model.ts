import type { ComponentType } from '@angular/cdk/portal';
import type { TemplateRef } from '@angular/core';

import type { IgntDialogSidePanelConfig } from '../../../../common/src/lib/dialog/models/dialog-options';

export type IgntTableFilterSidePanelConfig = IgntDialogSidePanelConfig;

export interface IgntTableAppliedFilter {
  disabled?: boolean;
  id: string;
  label: string;
}

export interface IgntTableFilterConfig {
  appliedFilters?: readonly IgntTableAppliedFilter[];
  sidePanelContent: ComponentType<unknown> | TemplateRef<unknown>;
  sidePanelOptions: IgntTableFilterSidePanelConfig;
  isActive?: boolean;
  isDisabled?: boolean;
  isVisible?: boolean;
}
