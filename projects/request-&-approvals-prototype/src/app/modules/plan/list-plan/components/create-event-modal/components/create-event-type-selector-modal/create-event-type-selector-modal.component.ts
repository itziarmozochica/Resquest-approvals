import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { IgntIconComponent, type IgntIconVariant } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { CreateEventType } from '../../create-event.model';
import { CreateEventTypeConfig } from '../../models/create-event-type-config.model';

export interface CreateEventTypeSelectorModalData {
  readonly types: readonly CreateEventTypeConfig[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntDialogModule, IgntIconComponent, TranslateModule],
  selector: 'app-create-event-type-selector-modal',
  standalone: true,
  styleUrl: './create-event-type-selector-modal.component.scss',
  templateUrl: './create-event-type-selector-modal.component.html',
})
export class CreateEventTypeSelectorModalComponent {
  readonly #data = inject<CreateEventTypeSelectorModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<CreateEventType | null>;

  protected readonly defaultIconVariant = 'light' as const;
  protected readonly types = this.#data.types;

  protected iconVariant(typeConfig: CreateEventTypeConfig): IgntIconVariant {
    return typeConfig.iconVariant ?? this.defaultIconVariant;
  }

  protected onSelectType(type: CreateEventType): void {
    this.#dialogRef.close(type);
  }

  protected typeDescriptionKey(type: CreateEventType): string {
    return `createEvent.typeSelector.descriptions.${type}`;
  }

  protected typeLabelKey(type: CreateEventType): string {
    return `createEvent.types.${type}`;
  }

  protected typeTestId(type: CreateEventType): string {
    return `create-event-type-option-${type}`;
  }
}
