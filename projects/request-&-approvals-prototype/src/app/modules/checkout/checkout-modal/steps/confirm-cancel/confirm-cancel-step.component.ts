import { ChangeDetectionStrategy, Component } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, TranslateModule],
  selector: 'app-confirm-cancel-step',
  standalone: true,
  styleUrl: './confirm-cancel-step.component.scss',
  templateUrl: './confirm-cancel-step.component.html',
})
export class ConfirmCancelStepComponent {}
