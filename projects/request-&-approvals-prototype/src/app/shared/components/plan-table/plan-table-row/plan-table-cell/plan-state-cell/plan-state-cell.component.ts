import { Component, Input } from '@angular/core';

import { Plan } from '@fz-original/app/shared/models/plan/plan.model';

@Component({
  selector: 'app-plan-state-cell',
  standalone: false,
  templateUrl: './plan-state-cell.component.html',
})
export class PlanStateCellComponent {
  @Input() plan: Plan | null = null;
}
