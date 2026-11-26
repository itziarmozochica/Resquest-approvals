import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { IgntAlertComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { IrFileSyncTrackerService } from '../../services/ir-file-sync-tracker.service';
import { DriveImportNotice } from './ir-drive-import-notices.model';
import { toDriveImportNotices } from './ir-drive-import-notices.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, TranslateModule],
  selector: 'app-ir-drive-import-notices',
  styleUrl: './ir-drive-import-notices.component.scss',
  templateUrl: './ir-drive-import-notices.component.html',
})
export class IrDriveImportNoticesComponent {
  readonly questionId = input.required<string>();
  readonly testId = input.required<string>();

  protected readonly fileListSplitMarker = '\u2063files\u2063';

  readonly #fileSyncTracker = inject(IrFileSyncTrackerService, { optional: true });

  protected readonly notices = computed<DriveImportNotice[]>(() => {
    const tracker = this.#fileSyncTracker;
    const leftOut = tracker?.leftOutFiles(this.questionId());
    if (tracker == null || leftOut == null) {
      return [];
    }
    return toDriveImportNotices(leftOut).filter(notice => !tracker.isNoticeDismissed(this.questionId(), notice.reason));
  });

  protected dismiss(notice: DriveImportNotice): void {
    this.#fileSyncTracker?.dismissNotice(this.questionId(), notice.reason);
  }
}
