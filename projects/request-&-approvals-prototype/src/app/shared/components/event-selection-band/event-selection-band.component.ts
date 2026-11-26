import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  contentChild,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { IgntExpansionPanelComponent } from '@ignite/legacy/components/ignt-expansion-panel/ignt-expansion-panel.component';
import { TranslateModule } from '@ngx-translate/core';

import { PageTitleModule } from '../../layout/page-title/page-title.module';
import { SearchBarComponent } from '../../search-bar/search-bar.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntExpansionPanelComponent, PageTitleModule, TranslateModule],
  selector: 'app-event-selection-band',
  styleUrl: './event-selection-band.component.scss',
  templateUrl: './event-selection-band.component.html',
})
export class EventSelectionBandComponent {
  readonly summary = input.required<string>();
  readonly foldWhenComplete = input(true);
  readonly heading = input<string | null>(null);
  readonly #breakpointStateService = inject(BreakpointStateService);
  protected readonly isMobile = this.#breakpointStateService.getStateProp('isMobile');
  protected readonly searchBar = contentChild(SearchBarComponent);
  readonly #closeIt = linkedSignal<{ hasAllMandatoryFilters: boolean } | undefined, { timestamp: number }>({
    computation: (status, previous) =>
      status?.hasAllMandatoryFilters && untracked(() => this.foldWhenComplete() && this.isMobile())
        ? { timestamp: Date.now() }
        : (previous?.value ?? { timestamp: 0 }),
    source: () => this.searchBar()?.mandatoryFiltersStatus(),
  });
  protected readonly closeIt = this.#closeIt.asReadonly();
  readonly #openIt = signal<{ timestamp: number }>({ timestamp: 0 });
  protected readonly openIt = this.#openIt.asReadonly();

  constructor() {
    afterNextRender(() => {
      if (this.#closeIt().timestamp !== 0) {
        this.fold();
      }
    });
  }

  fold(): void {
    this.#closeIt.set({ timestamp: Date.now() });
  }

  unfold(): void {
    this.#openIt.set({ timestamp: Date.now() });
  }
}
