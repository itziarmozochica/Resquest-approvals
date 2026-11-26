import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';

import type { ResolvedFztTicketSelectorTranslations } from '../../models/ticket-selector-translations.model';
import type { FztBreadcrumbVm } from '../../models/ticket-selector-vm.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconButtonComponent, IgntIconComponent],
  selector: 'fzt-breadcrumbs',
  standalone: true,
  styleUrl: './breadcrumbs.component.scss',
  templateUrl: './breadcrumbs.component.html',
})
export class FztBreadcrumbsComponent {
  readonly breadcrumbs = input.required<readonly FztBreadcrumbVm[]>();
  readonly translations = input.required<ResolvedFztTicketSelectorTranslations>();
  readonly isMobile = input(false);
  readonly breadcrumbNavigated = output<number>();

  protected readonly backIcon: readonly ['fas', 'arrow-left'] = ['fas', 'arrow-left'];
  protected readonly currentBreadcrumb = computed<FztBreadcrumbVm | null>(() => {
    const breadcrumbs = this.breadcrumbs();

    return breadcrumbs.length === 0 ? null : breadcrumbs[breadcrumbs.length - 1];
  });
  protected readonly isHomeDisabled = computed<boolean>(() => this.breadcrumbs().length <= 1);
  protected readonly showTrail = computed<boolean>(() => this.breadcrumbs().length > 1);
  protected readonly trailItems = computed<readonly FztBreadcrumbVm[]>(() => this.breadcrumbs().slice(1));
  protected readonly visible = computed<boolean>(() => (this.isMobile() ? this.breadcrumbs().length > 1 : this.breadcrumbs().length > 0));

  protected navigateBack(): void {
    const breadcrumbs = this.breadcrumbs();

    if (breadcrumbs.length <= 1) {
      return;
    }

    this.#navigateTo(breadcrumbs[breadcrumbs.length - 2]);
  }

  protected navigateToBreadcrumb(breadcrumb: FztBreadcrumbVm): void {
    this.#navigateTo(breadcrumb);
  }

  protected navigateToHome(): void {
    const breadcrumbs = this.breadcrumbs();

    if (breadcrumbs.length === 0) {
      return;
    }

    this.#navigateTo(breadcrumbs[0]);
  }

  #navigateTo(breadcrumb: FztBreadcrumbVm): void {
    if (breadcrumb.isCurrentLevel) {
      return;
    }

    this.breadcrumbNavigated.emit(breadcrumb.depth);
  }
}
