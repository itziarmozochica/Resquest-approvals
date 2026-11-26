import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent],
  selector: 'app-quick-setup-inventory-drop-hint',
  styleUrl: './quick-setup-inventory-drop-hint.component.scss',
  templateUrl: './quick-setup-inventory-drop-hint.component.html',
})
export class QuickSetupInventoryDropHintComponent {
  readonly message = input.required<string>();
}
