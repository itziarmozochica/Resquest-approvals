import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ProjectDriveFolder } from '@fz-original/app/modules/project-management/models/project-drive-folder.model';
import { ProjectDriveFolderService } from '@fz-original/app/modules/project-management/services/project-drive-folder.service';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { TranslateModule } from '@ngx-translate/core';
import { filter, switchMap, take } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-drive-folder-button',
  standalone: true,
  styleUrl: './drive-folder-button.component.scss',
  templateUrl: './drive-folder-button.component.html',
})
export class DriveFolderButtonComponent {
  readonly launchId = input.required<string | null>();
  readonly folderUrl = input<string | null>(null);
  readonly hasLaunchFallback = input<boolean>(true);
  readonly sheetUrl = input<string | null>(null);

  readonly folder = signal<ProjectDriveFolder | null>(null);
  readonly href = computed(() => this.sheetUrl() ?? (this.folderUrl() || this.folder()?.driveFolderUrl || null));
  protected readonly labelKey = computed(() =>
    this.sheetUrl() !== null ? 'projectManagement.drive.openSheet' : 'projectManagement.drive.openFolder',
  );
  readonly visible = computed(() => this.href() !== null);

  readonly #destroyRef = inject(DestroyRef);
  readonly #partnerService = inject(PartnerService);
  readonly #service = inject(ProjectDriveFolderService);

  constructor() {
    effect(onCleanup => {
      const launchId = this.launchId();
      if (this.sheetUrl() !== null || this.folderUrl()) {
        this.folder.set(null);
        return;
      }
      if (!launchId || !this.hasLaunchFallback()) {
        this.folder.set(null);
        return;
      }
      const sub = this.#partnerService
        .observePartner()
        .pipe(
          filter((partner): partner is Partner => partner !== null),
          take(1),
          switchMap(partner => this.#service.get(partner.id, launchId)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: response => this.folder.set(response.error || !response.data ? null : response.data),
          error: () => this.folder.set(null),
        });
      onCleanup(() => sub.unsubscribe());
    });
  }
}
