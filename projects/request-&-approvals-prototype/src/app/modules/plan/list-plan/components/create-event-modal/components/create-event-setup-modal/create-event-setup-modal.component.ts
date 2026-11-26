import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { planCreationAdvancedSelected } from '../../../../../tracking/events/plan-creation-advanced-selected.event';
import { quickSetupSelected } from '../../../../../tracking/events/quick-setup-selected.event';
import { planTrackingProvider } from '../../../../../tracking/plan.tracking-provider';
import {
  type CreateEventSetupModalData,
  type CreateEventSetupModalResult,
  type CreateEventSetupOption,
} from './create-event-setup-modal.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntDialogModule, IgntIconComponent, NgTemplateOutlet, TranslateModule],
  providers: [...planTrackingProvider()],
  selector: 'app-create-event-setup-modal',
  standalone: true,
  styleUrl: './create-event-setup-modal.component.scss',
  templateUrl: './create-event-setup-modal.component.html',
})
export class CreateEventSetupModalComponent {
  static readonly options: readonly CreateEventSetupOption[] = [
    {
      actionable: true,
      descriptionKey: 'createEvent.setupModal.quickSetup.description',
      icon: 'bolt',
      id: 'quick-setup',
      titleKey: 'createEvent.setupModal.quickSetup.title',
    },
    {
      actionable: true,
      descriptionKey: 'createEvent.setupModal.advancedSetup.description',
      icon: 'sliders-h',
      id: 'advanced-setup',
      titleKey: 'createEvent.setupModal.advancedSetup.title',
    },
    {
      actionable: true,
      descriptionKey: 'createEvent.setupModal.duplicateEvent.description',
      icon: 'clone',
      id: 'duplicate-event',
      titleKey: 'createEvent.setupModal.duplicateEvent.title',
    },
  ] as const;

  readonly #data = inject<CreateEventSetupModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<CreateEventSetupModalResult>;
  readonly #fzTracking = inject(FzTrackingService);

  protected readonly eventType = this.#data.eventType;
  protected readonly iconVariant = 'light' as const;
  protected readonly options = this.#data.showQuickSetup
    ? CreateEventSetupModalComponent.options
    : CreateEventSetupModalComponent.options.filter(option => option.id !== 'quick-setup');

  protected onOptionSelect(option: CreateEventSetupOption): void {
    if (!option.actionable) {
      return;
    }

    if (option.id === 'quick-setup') {
      this.#fzTracking.track(quickSetupSelected({ event_type: this.eventType }));
      this.#dialogRef.close('quick-setup');
      return;
    }

    if (option.id === 'advanced-setup') {
      this.#fzTracking.track(planCreationAdvancedSelected({ event_type: this.eventType }));
      this.#dialogRef.close('advanced-setup');
      return;
    }

    if (option.id === 'duplicate-event') {
      this.#dialogRef.close('duplicate-event');
    }
  }
}
