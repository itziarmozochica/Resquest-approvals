import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IgntButtonComponent, type IgntButtonVariant } from '@ignite/common';
import { IgntIconComponent, type IgntIconName } from '@ignite/icon';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntIconComponent, IgntWrapperCardComponent],
  selector: 'app-immersive-state-panel',
  standalone: true,
  styleUrl: './immersive-state-panel.component.scss',
  templateUrl: './immersive-state-panel.component.html',
})
export class ImmersiveStatePanelComponent {
  readonly icon = input.required<IgntIconName>();
  readonly title = input.required<string>();
  readonly actionDisabled = input(false);
  readonly actionLabel = input<string | null>(null);
  readonly actionLoading = input(false);
  readonly actionVariant = input<IgntButtonVariant>('primary');
  readonly body = input<string | null>(null);
  readonly iconSpin = input(false);
  readonly secondaryBody = input<string | null>(null);

  readonly actionClick = output<void>();
}
