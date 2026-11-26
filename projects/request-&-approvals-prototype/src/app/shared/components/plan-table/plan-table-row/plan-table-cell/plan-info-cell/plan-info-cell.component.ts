import { Component, Input } from '@angular/core';

import { Plan } from '@fz-original/app/shared/models/plan/plan.model';

@Component({
  selector: 'app-plan-info-cell',
  standalone: false,
  templateUrl: './plan-info-cell.component.html',
  styleUrls: ['./plan-info-cell.component.scss'],
})
export class PlanInfoCellComponent {
  @Input() plan: Plan | null = null;
}
