import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-testid]': 'testId()',
  },
  imports: [IgntButtonComponent, IgntWrapperCardComponent, TranslateModule],
  selector: 'fz-empty-state',
  standalone: true,
  styleUrl: './empty-state.component.scss',
  templateUrl: './empty-state.component.html',
})
export class EmptyStateComponent {
  readonly description = input.required<string>();
  readonly label = input.required<string>();
  readonly testId = input.required<string>();
  readonly title = input.required<string>();
  readonly leadingIcon = input<IconProp>(['fal', 'plus']);
  readonly showLeadingIcon = input(false, { transform: booleanAttribute });
  readonly emptyStateClick = output();

  protected readonly actionTestId = computed(() => `${this.testId()}-button`);
}
