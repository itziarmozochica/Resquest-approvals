import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TemplatedTooltipDirective } from '@fz-original/app/shared/directives/templated-tooltip.directive';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, TemplatedTooltipDirective, TranslateModule],
  selector: 'app-fever-only-marker',
  standalone: true,
  styleUrl: './fever-only-marker.component.scss',
  templateUrl: './fever-only-marker.component.html',
})
export class FeverOnlyMarkerComponent {}
