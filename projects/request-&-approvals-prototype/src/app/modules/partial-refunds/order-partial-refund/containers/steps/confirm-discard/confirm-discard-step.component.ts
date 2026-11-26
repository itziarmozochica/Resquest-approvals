import { ChangeDetectionStrategy, Component } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

/** No logic: the two answers are the footer's, declared in the config. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, TranslateModule],
  selector: 'app-order-partial-refund-confirm-discard-step',
  styleUrl: './confirm-discard-step.component.scss',
  templateUrl: './confirm-discard-step.component.html',
})
export class ConfirmDiscardStepComponent {}
