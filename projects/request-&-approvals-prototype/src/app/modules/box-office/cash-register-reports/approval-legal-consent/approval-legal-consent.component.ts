import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  templateUrl: './approval-legal-consent.component.html',
  styleUrls: ['./approval-legal-consent.component.scss'],
  imports: [TranslateModule, IconsModule, IgntButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalLegalConsentComponent {
  #dialogRef = inject(DialogRef);

  approve(): void {
    this.#dialogRef.close(true);
  }

  cancel(): void {
    this.#dialogRef.close(false);
  }
}
