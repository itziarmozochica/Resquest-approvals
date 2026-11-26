import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IGNT_DIALOG_DATA, IgntDialogCloseDirective, IgntDialogModule } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import type { WarehouseDetailsSidePanelData } from '../../../models/dialog/product-variation/warehouse-details-side-panel.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-testid]': '"warehouse-details-panel"',
  },
  imports: [CurrencyPipe, IgntButtonComponent, IgntDialogCloseDirective, IgntDialogModule, IgntIconComponent, TranslateModule],
  selector: 'fz-retail-warehouse-details',
  standalone: true,
  styleUrl: './warehouse-details.component.scss',
  templateUrl: './warehouse-details.component.html',
})
export class WarehouseDetailsComponent {
  protected readonly dialogData = inject<WarehouseDetailsSidePanelData>(IGNT_DIALOG_DATA);
}
