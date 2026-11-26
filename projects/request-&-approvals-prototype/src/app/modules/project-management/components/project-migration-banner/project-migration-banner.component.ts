import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Signal, signal } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { FeatureFlags } from '../../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../../shared/optimizely/optimizely.service';

const DISMISS_STORAGE_KEY = 'launch-migration-banner-dismissed';

@Component({
  selector: 'app-project-migration-banner',
  templateUrl: './project-migration-banner.component.html',
  styleUrls: ['./project-migration-banner.component.scss'],
  imports: [TranslateModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectMigrationBannerComponent {
  readonly #dismissed = signal<boolean>(false);
  readonly visible: Signal<boolean> = computed(() => this.#flagEnabled && !this.#dismissed());

  readonly #document = inject(DOCUMENT);
  readonly #optimizely = inject(OptimizelyService);
  readonly #flagEnabled: boolean;

  constructor() {
    this.#flagEnabled = this.#optimizely.isFeatureEnabled(FeatureFlags.LAUNCH_MIGRATION_ANNOUNCEMENT) === true;
    this.#dismissed.set(this.#readDismissed());
  }

  dismiss(): void {
    this.#dismissed.set(true);
    this.#document.defaultView?.localStorage?.setItem(DISMISS_STORAGE_KEY, 'true');
  }

  #readDismissed(): boolean {
    return this.#document.defaultView?.localStorage?.getItem(DISMISS_STORAGE_KEY) === 'true';
  }
}
