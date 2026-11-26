import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import {
  IGNT_DIALOG_DATA,
  IgntButtonComponent,
  IgntDialogCloseDirective,
  IgntDialogContentComponent,
  IgntDialogFooterComponent,
  IgntDialogHeaderComponent,
} from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import type { ImmersiveAutoTranslateDialogData } from '../../models/immersive-auto-translate-dialog.model';

/**
 * Asks how to translate a field when some of its languages already hold text. Closes with
 * `'missing'`, `'all'` or `false` (cancel); picking `'all'` replaces the text those languages hold.
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
  selector: 'app-immersive-auto-translate-dialog',
  templateUrl: './immersive-auto-translate-dialog.component.html',
})
export class ImmersiveAutoTranslateDialogComponent {
  protected readonly data = inject<ImmersiveAutoTranslateDialogData>(IGNT_DIALOG_DATA);
}
