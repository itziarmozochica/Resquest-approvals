import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IGNT_DIALOG_DATA } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { EfrHealthCheckPendingDialogData } from '../../services/efsta-fiscal/models/efr-health-check.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, TranslateModule],
  selector: 'fzo-efr-health-check-pending-modal',
  standalone: true,
  styleUrl: './efr-health-check-pending-modal.component.scss',
  templateUrl: './efr-health-check-pending-modal.component.html',
})
export class EfrHealthCheckPendingModalComponent {
  readonly #data = inject<EfrHealthCheckPendingDialogData | undefined>(IGNT_DIALOG_DATA, { optional: true });

  protected readonly descriptionKey = this.#data?.descriptionKey ?? 'boxOffice.fiscal.healthCheck.pending.description';
  protected readonly titleKey = this.#data?.titleKey ?? 'boxOffice.fiscal.healthCheck.pending.title';
}
