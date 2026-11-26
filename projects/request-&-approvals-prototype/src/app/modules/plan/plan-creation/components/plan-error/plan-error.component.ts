import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, FaIconComponent, IgntButtonComponent],
  selector: 'app-plan-error',
  standalone: true,
  styleUrls: ['./plan-error.component.scss'],
  templateUrl: './plan-error.component.html',
})
export class PlanErrorComponent {
  @Input() message: string | null = null;
  @Output() retry = new EventEmitter<void>();
  @Input() retryButtonLabel = 'planSetup.tryAgain';
  @Input() showRetryButton = true;
}
