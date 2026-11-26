import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { LaunchPickerComponent } from '@fz-original/app/modules/ir-approval/information-requests/components/launch-picker/launch-picker.component';
import { Project } from '@fz-original/app/modules/project-management/models/project.model';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntButtonComponent, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

export interface PlanLaunchModalData {
  launches: Project[];
}

export type PlanLaunchModalResult = { launchCode: string | null } | null;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntDialogModule, LaunchPickerComponent, TranslateModule],
  selector: 'app-plan-launch-modal',
  styleUrl: './plan-launch-modal.component.scss',
  templateUrl: './plan-launch-modal.component.html',
})
export class PlanLaunchModalComponent {
  readonly #data = inject(IGNT_DIALOG_DATA) as PlanLaunchModalData;
  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<PlanLaunchModalResult>;

  protected readonly launches = this.#data.launches;
  protected readonly selectedLaunchId = signal('');
  readonly #selectedLaunchCode = computed(() => this.launches.find(launch => launch.id === this.selectedLaunchId())?.launchIdC ?? null);

  protected cancel(): void {
    this.#dialogRef.close(null);
  }

  protected confirm(): void {
    this.#dialogRef.close({ launchCode: this.#selectedLaunchCode() });
  }

  protected onLaunchSelected(launchId: string): void {
    this.selectedLaunchId.set(launchId);
  }
}
