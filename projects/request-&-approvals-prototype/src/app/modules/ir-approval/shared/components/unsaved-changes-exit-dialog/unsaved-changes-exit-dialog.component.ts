import { ChangeDetectionStrategy, Component } from '@angular/core';

import { IgntDialogCloseDirective, IgntDialogModule } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

/** Exit confirmation for screens with unsaved work: save & exit (primary) or exit discarding changes. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntDialogModule, IgntDialogCloseDirective, IgntButtonComponent, TranslateModule],
  selector: 'app-unsaved-changes-exit-dialog',
  standalone: true,
  templateUrl: './unsaved-changes-exit-dialog.component.html',
})
export class UnsavedChangesExitDialogComponent {}
