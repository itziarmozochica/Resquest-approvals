import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { IGNT_DIALOG_DATA, IgntDialogModule } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { retailTypeLabels } from '../../../retail/models/retail-type.model';
import type { ChannelsSidePanelData } from '../../models/dialog/channels-side-panel.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-testid]': '"channels-side-panel"',
  },
  imports: [IgntDialogModule, IgntIconComponent, TranslateModule],
  selector: 'fz-channels-side-panel',
  standalone: true,
  styleUrl: './channels-side-panel.component.scss',
  templateUrl: './channels-side-panel.component.html',
})
export class ChannelsSidePanelComponent {
  protected readonly dialogData = inject<ChannelsSidePanelData>(IGNT_DIALOG_DATA);

  protected readonly retailSetupTypeLabelKey = computed(() => {
    const type = this.dialogData.retailSetupType;
    return type ? retailTypeLabels[type] : null;
  });
}
