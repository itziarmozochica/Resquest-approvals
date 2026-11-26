import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TemplatedTooltipDirective } from '@fz-original/app/shared/directives/templated-tooltip.directive';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, TemplatedTooltipDirective, TranslateModule],
  selector: 'app-schedule-tier-calendar-drag-hint',
  styleUrl: './schedule-tier-calendar-drag-hint.component.scss',
  templateUrl: './schedule-tier-calendar-drag-hint.component.html',
})
export class ScheduleTierCalendarDragHintComponent {}
