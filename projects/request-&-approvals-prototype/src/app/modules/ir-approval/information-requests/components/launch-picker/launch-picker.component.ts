import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { Project } from '@fz-original/app/modules/project-management/models/project.model';
import { TranslateModule } from '@ngx-translate/core';

/**
 */
@Component({
  selector: 'app-launch-picker',
  templateUrl: './launch-picker.component.html',
  styleUrls: ['./launch-picker.component.scss'],
  imports: [TranslateModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaunchPickerComponent {
  readonly launches = input<Project[]>([]);
  readonly selectedLaunchId = input<string | null>(null);
  readonly loading = input<boolean>(false);

  readonly launchSelected = output<string>();

  readonly search = signal<string>('');

  /** Launches matching the search term (by name, city or display code); the selected one is always kept. */
  readonly filtered = computed<Project[]>(() => {
    const term = this.search().trim().toLowerCase();
    const launches = this.launches();
    if (!term) {
      return launches;
    }
    const selectedId = this.selectedLaunchId();
    return launches.filter(
      launch =>
        launch.id === selectedId ||
        launch.name.toLowerCase().includes(term) ||
        (launch.city ?? '').toLowerCase().includes(term) ||
        (launch.displayCode ?? '').toLowerCase().includes(term),
    );
  });

  onSearch(value: string): void {
    this.search.set(value);
  }

  select(launchId: string): void {
    this.launchSelected.emit(launchId);
  }

  launchLabel(launch: Project): string {
    const parts = [launch.city, launch.displayCode].filter((part): part is string => Boolean(part));
    return parts.length ? `${launch.name} · ${parts.join(' · ')}` : launch.name;
  }
}
