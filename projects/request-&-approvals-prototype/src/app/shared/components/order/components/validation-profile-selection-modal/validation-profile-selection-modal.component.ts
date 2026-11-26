import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { TranslateModule } from '@ngx-translate/core';

import { AccessControlProfile } from '../../../../models/access-control/access-control.model';
import { ValidationProfileSelectionModalData, ValidationProfileSelectionModalResult } from './validation-profile-selection-modal.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntDialogModule, IgntListItemComponent, IgntRadioComponent, TranslateModule],
  selector: 'app-validation-profile-selection-modal',
  standalone: true,
  styleUrls: ['./validation-profile-selection-modal.component.scss'],
  templateUrl: './validation-profile-selection-modal.component.html',
})
export class ValidationProfileSelectionModalComponent {
  readonly #dialogRef = inject<IgntDialogRef<ValidationProfileSelectionModalResult>>(IGNT_DIALOG_REF);

  protected readonly profiles: AccessControlProfile[] = inject<ValidationProfileSelectionModalData>(IGNT_DIALOG_DATA).profiles;
  protected readonly selectedProfileId: WritableSignal<string | null> = signal<string | null>(null);

  protected confirm(): void {
    const profileId = this.selectedProfileId();
    if (profileId === null) {
      return;
    }
    this.#dialogRef.close({ profileId } satisfies ValidationProfileSelectionModalResult);
  }

  protected selectProfile(profileId: string): void {
    this.selectedProfileId.set(profileId);
  }
}
