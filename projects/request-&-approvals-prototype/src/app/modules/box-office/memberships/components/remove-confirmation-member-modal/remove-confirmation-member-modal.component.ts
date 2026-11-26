import { ChangeDetectionStrategy, Component, EventEmitter, inject, Output } from '@angular/core';

import { IGNT_DIALOG_REF, IgntDialogRef } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-memberships-remove-confirmation-member-modal',
  templateUrl: './remove-confirmation-member-modal.component.html',
  styleUrls: ['./remove-confirmation-member-modal.component.scss'],
  imports: [TranslateModule, IgntButtonComponent, IgntIconComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipsRemoveConfirmationMemberModalComponent {
  #activeModal = inject(NgbActiveModal, { optional: true });
  #dialogRef = inject<IgntDialogRef<boolean> | null>(IGNT_DIALOG_REF, { optional: true });

  @Output() confirmRemoveMember = new EventEmitter<void>();

  removeMember(): void {
    this.confirmRemoveMember.emit();
    this.#close(true);
  }

  closeModal(): void {
    this.#close(false);
  }

  #close(confirmed: boolean): void {
    if (this.#dialogRef) {
      this.#dialogRef.close(confirmed);
      return;
    }
    this.#activeModal?.close();
  }
}
