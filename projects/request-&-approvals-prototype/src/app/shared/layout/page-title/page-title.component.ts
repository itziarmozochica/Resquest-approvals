import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, HostAttributeToken, inject, Injector, input, Input } from '@angular/core';
import { Params, Router } from '@angular/router';

import type { IgntButtonIcon } from '@ignite/common';

import { NavigationService } from '../../services/navigation/navigation.service';
import { createCopiedConfirmation } from '../../utils/copied-confirmation.util';
import { isModifiedClick } from '../../utils/modified-click.util';

/**
 * A copy-to-clipboard control rendered after a subsection's title, named by `label` for assistive
 * tech. On an item with no title it takes the title's place as a labelled button, with `label` as
 * its visible text.
 */
export interface SubsectionCopy {
  label: string;
  value: string;
}

export interface SubsectionItem {
  /** Omitted on an item that is only a `copy` control. */
  title?: string;
  link?: string;
  queryParams?: Params;
  copy?: SubsectionCopy;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-page-title',
  standalone: false,
  styleUrl: './page-title.component.scss',
  templateUrl: './page-title.component.html',
})
export class PageTitleComponent {
  readonly #injector = inject(Injector);
  readonly #location = inject(Location);
  readonly #router = inject(Router);

  @Input() backInHistory = false;
  /** The back chevron's accessible name. With `backRoute`, it also renders that chevron as a real, history-aware link. */
  backLabel = input<string>('');
  backRoute = input<string>('');
  /**
   * A full in-app URL, path and query, that the chevron links to as it is; for a return target
   * resolved from navigation history. Rendered as a real link, named by `backLabel`.
   */
  backUrl = input<string>('');
  @Input() description = '';
  @Input() section = '';
  @Input() sectionLink = '';
  /**
   * Query params for the section link. A section that keeps state in the URL — a filtered list — is
   * returned to as it was left, the way the back chevron already does it. Unset, the link navigates
   * with no params, which is what every other caller wants.
   */
  sectionQueryParams = input<Params | undefined>(undefined);
  /** @deprecated Use `subsections` array instead */
  @Input() subsection = '';
  subsections = input<SubsectionItem[]>([]);
  @Input() title = '';
  @Input() upperTitle = '';

  protected readonly hasBackRoute = computed(() => this.backRoute()?.length > 0);
  protected readonly hasBackUrl = computed(() => this.backUrl().length > 0);
  protected readonly hasLabelledBack = computed(() => this.backLabel().length > 0 && this.hasBackRoute());
  protected readonly backHref = computed(() =>
    this.hasLabelledBack()
      ? this.#location.prepareExternalUrl(this.#router.serializeUrl(this.#router.createUrlTree([this.backRoute()])))
      : '',
  );
  protected readonly backUrlHref = computed(() => (this.hasBackUrl() ? this.#location.prepareExternalUrl(this.backUrl()) : ''));

  protected readonly copyConfirmation = createCopiedConfirmation();
  /** The `light` host class swaps the dark band for a white one; the labelled copy button takes Ignite's contrast palette only on the dark band. */
  protected readonly onDarkBand = !(inject(new HostAttributeToken('class'), { optional: true }) ?? '').split(/\s+/).includes('light');
  protected readonly copiedIcon: IgntButtonIcon = { name: 'check', variant: 'light' };
  protected readonly copyIcon: IgntButtonIcon = { name: 'copy', variant: 'light' };

  goToBackLink(): void {
    if (this.hasBackRoute()) {
      this.#router.navigate([this.backRoute()], { queryParamsHandling: 'merge' });
    } else if (this.backInHistory) {
      this.#location.back();
    }
  }

  /** Lets modified clicks reach the browser (new tab, new window); a plain click navigates in the app. */
  protected onBackUrlClick(event: MouseEvent): void {
    if (isModifiedClick(event)) {
      return;
    }

    event.preventDefault();
    void this.#router.navigateByUrl(this.backUrl());
  }

  /** Lets modified clicks reach the browser (new tab, new window); a plain click goes back without stacking a history entry. */
  protected onBackLabelClick(event: MouseEvent): void {
    if (isModifiedClick(event)) {
      return;
    }

    event.preventDefault();
    // Resolved on click, not at construction: eagerly injecting NavigationService would build it
    // (and its Router.events subscription) for every render of this widely used component, which
    // breaks the many specs that render it with a stubbed Router.
    this.#injector.get(NavigationService).backTo(this.backRoute());
  }

  protected async onCopySubsection(item: SubsectionItem): Promise<void> {
    if (item.copy) {
      await this.copyConfirmation.copy(item.copy.value);
    }
  }
}
