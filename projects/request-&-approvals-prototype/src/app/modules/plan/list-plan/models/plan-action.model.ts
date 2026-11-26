import { NavigationExtras } from '@angular/router';

import { Plan } from '../../../../shared/models/plan/plan.model';
import { PlanNavigateToSection } from './plan-navigate-to-section.model';

export interface PlanAction {
  plan: Plan;
  source: string;
  navigateTo: PlanNavigateToSection;
  commands?: any[];
  extras?: NavigationExtras;
  trackingLink?: string;
}
