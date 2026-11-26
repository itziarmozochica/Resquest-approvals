import { ChangeDetectionStrategy, Component, effect, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { TicketDeliverySettingsRule } from '@fz-original/app/shared/ticket-delivery-settings/models/ticket-delivery-settings.model';
import { TranslateModule } from '@ngx-translate/core';

import { ResaleSectionConfig } from '../../models/settings-configs.model';
import { DelayedTicketReleaseSectionComponent } from '../delayed-ticket-release-section/delayed-ticket-release-section.component';
import { ResaleSectionComponent } from '../resale-section/resale-section.component';
import { TicketSettingsFormGroup } from './ticket-settings-form.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DelayedTicketReleaseSectionComponent, ReactiveFormsModule, ResaleSectionComponent, TranslateModule],
  selector: 'app-ticket-settings-form',
  standalone: true,
  styleUrl: './ticket-settings-form.component.scss',
  templateUrl: './ticket-settings-form.component.html',
})
export class TicketSettingsFormComponent {
  readonly form = input.required<TicketSettingsFormGroup>();
  readonly canEditPlan = input<boolean>(true);
  readonly delayedTicketReleaseVisible = input<boolean>(false);
  readonly fallbackFirstActiveTimeSlot = input<string | null>(null);
  readonly fallbackTimezone = input<string>('');
  readonly onFormDirtyChange = input<((dirty: boolean) => void) | undefined>(undefined);
  readonly planId = input<number>(0);
  readonly planName = input<string>('');
  readonly resaleConfig = input<ResaleSectionConfig | null>(null);
  readonly ticketDeliveryRule = input<TicketDeliverySettingsRule | null>(null);

  constructor() {
    effect(() => {
      const form = this.form();
      if (this.canEditPlan()) {
        form.enable({ emitEvent: false });
      } else {
        form.disable({ emitEvent: false });
      }
    });
  }
}
