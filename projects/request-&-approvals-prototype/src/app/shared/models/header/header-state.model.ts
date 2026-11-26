import { TemplateRef } from '@angular/core';

import { MenuItem } from './header.model';

export interface HeaderState {
  centerAdjacentContent: TemplateRef<unknown> | null;
  centerContent: TemplateRef<unknown> | null;
  featureMenuItems: MenuItem[];
  globalMenuItems: MenuItem[];
  headerActions: MenuItem[];
  isMenuOpen: boolean;
}
