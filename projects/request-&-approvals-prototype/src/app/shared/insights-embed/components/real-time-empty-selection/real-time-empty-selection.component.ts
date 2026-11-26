import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Texts arrive already translated, so each page owns its own copy. `hint` is optional: big launches
 * uses it for the «same currency» line, which makes no sense on other dashboards.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-real-time-empty-selection',
  standalone: true,
  styleUrl: './real-time-empty-selection.component.scss',
  templateUrl: './real-time-empty-selection.component.html',
})
export class RealTimeEmptySelectionComponent {
  readonly dataTestIdPrefix = input.required<string>();
  readonly detail = input.required<string>();
  readonly imageSrc = input.required<string>();
  readonly title = input.required<string>();
  readonly hint = input<string | null>(null);
}
