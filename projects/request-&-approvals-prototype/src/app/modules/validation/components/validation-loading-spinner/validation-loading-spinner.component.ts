import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent],
  selector: 'app-validation-loading-spinner',
  standalone: true,
  styleUrl: './validation-loading-spinner.component.scss',
  templateUrl: './validation-loading-spinner.component.html',
})
export class ValidationLoadingSpinnerComponent {
  readonly spinnerTestId = input.required<string>();
}
