import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { HardwareTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import {
  IGNT_DIALOG_DATA,
  IgntButtonComponent,
  IgntDialogCloseDirective,
  IgntDialogContentComponent,
  IgntDialogFooterComponent,
  IgntDialogHeaderComponent,
} from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { PosHardwareCheckResolution } from '../../models/pos-hardware-check.model';
import { type PosHardwareMismatchContext } from '../../models/pos-ui-request.model';

/**
 * "Wrong onsite setup": the block offers Cancel and Select onsite setup; with an override deadline it
 * is the warning and also offers Continue anyway. Each button closes with its resolution; ✕ and
 * Escape close with `undefined`, which the opener reads as `cancelled`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntButtonComponent,
    IgntDialogCloseDirective,
    IgntDialogContentComponent,
    IgntDialogFooterComponent,
    IgntDialogHeaderComponent,
    TranslateModule,
  ],
  selector: 'app-hardware-mismatch-modal',
  templateUrl: './hardware-mismatch-modal.component.html',
})
export class HardwareMismatchModalComponent {
  readonly #data = inject<PosHardwareMismatchContext>(IGNT_DIALOG_DATA);

  protected readonly overrideDeadline = this.#data.overrideDeadline;
  protected readonly resolution = PosHardwareCheckResolution;
  protected readonly translationPrefix = `oneStopShop.hardwareMismatchModal.${
    this.#data.setupHardwareType === HardwareTypeEnum.dual_screen ? 'dualScreen' : 'desktop'
  }`;
}
