import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IgntButtonComponent, IgntPillButtonComponent } from '@ignite/common';

import type { FztRecentOnsiteSetupOption } from '../../models/onsite-setup-modal.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntPillButtonComponent],
  selector: 'fzt-onsite-setup-recents',
  styleUrl: './onsite-setup-recents.component.scss',
  templateUrl: './onsite-setup-recents.component.html',
})
export class FztOnsiteSetupRecentsComponent {
  readonly recentLabel = input.required<string>();
  readonly recents = input.required<FztRecentOnsiteSetupOption[]>();
  readonly searchLabel = input.required<string>();
  readonly recentSelected = output<FztRecentOnsiteSetupOption>();
  readonly searchActivated = output();
}
