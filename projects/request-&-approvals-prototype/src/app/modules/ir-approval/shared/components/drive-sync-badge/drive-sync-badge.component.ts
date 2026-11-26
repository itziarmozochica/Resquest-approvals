import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { FzUploadProgress } from '@fz-original/app/modules/ir-approval/shared/models/fz-upload.model';
import { DriveSyncStatus } from '@fz-original/app/shared/models/drive-sync-status.enum';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-drive-sync-badge',
  standalone: true,
  styleUrl: './drive-sync-badge.component.scss',
  templateUrl: './drive-sync-badge.component.html',
})
export class DriveSyncBadgeComponent {
  readonly status = input.required<DriveSyncStatus>();
  readonly driveUrl = input<string | undefined>(undefined);
  readonly importProgress = input<FzUploadProgress | null>(null);

  readonly statusKey = computed(() => this.status().toLowerCase().replace(/_/g, '-'));
  readonly isInDrive = computed(() => this.status() === DriveSyncStatus.IN_DRIVE);
  protected readonly shownImportProgress = computed<FzUploadProgress | null>(() =>
    this.status() === DriveSyncStatus.IMPORTING_FROM_DRIVE ? this.importProgress() : null,
  );
}
