import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';

import { SettingsListSectionState } from './settings-list-section-state.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntAlertComponent, IgntIconComponent],
  selector: 'app-settings-list-section',
  styleUrl: './settings-list-section.component.scss',
  templateUrl: './settings-list-section.component.html',
})
export class SettingsListSectionComponent {
  readonly state = input.required<SettingsListSectionState>();
  /** With neither a title nor a create label, the page above the list carries both and the heading row is not drawn. */
  readonly title = input<string>();
  readonly ctaLabel = input<string>();
  readonly testIdPrefix = input<string>('settings-list-section');

  readonly ctaCallback = output<void>();
}
