import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector, input, Signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';

import { confirmDiscardUnsavedChanges } from '@fz-original/app/shared/guard/has-unsaved-changes/unsaved-changes-confirm.util';
import { PlanPreviewLink } from '@fz-original/app/shared/models/plan/plan-preview-links.model';
import { PlanPreviewLinksService } from '@fz-original/app/shared/services/plan/plan-preview-links.service';
import { parseHttpUrl } from '@fz-original/app/shared/utils/http-url.util';
import { IgntDialogService } from '@ignite/common';
import {
  IgntButtonDropdownComponent,
  IgntButtonDropdownOption,
} from '@ignite/legacy/components/ignt-button-dropdown/ignt-button-dropdown.component';
import { IgntLinkComponent } from '@ignite/legacy/components/ignt-link/ignt-link.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { combineLatest, switchMap } from 'rxjs';
import { startWith } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonDropdownComponent, IgntLinkComponent, TranslateModule],
  selector: 'app-plan-preview-links',
  standalone: true,
  styleUrls: ['./plan-preview-links.component.scss'],
  templateUrl: './plan-preview-links.component.html',
})
export class PlanPreviewLinksComponent {
  #planPreviewLinksService = inject(PlanPreviewLinksService);
  #dialogService = inject(IgntDialogService);
  #translateService = inject(TranslateService);
  #injector = inject(Injector);
  #destroyRef = inject(DestroyRef);

  partnerId = input.required<number>();

  planId = input.required<number>();

  hasUnsavedChanges = input<() => boolean>(() => false);

  previewLinks: Signal<PlanPreviewLink[] | null> = toSignal(
    combineLatest([toObservable(this.planId), toObservable(this.partnerId)]).pipe(
      switchMap(([planId, partnerId]) => this.#planPreviewLinksService.getPreviewLinks(partnerId, planId).pipe(startWith(null))),
    ),
    { initialValue: null },
  );

  firstLink: Signal<PlanPreviewLink | null> = computed<PlanPreviewLink | null>(() => this.previewLinks()?.[0] ?? null);

  firstLinkSafeUrl: Signal<string | null> = computed<string | null>(() => {
    const link = this.firstLink();
    return link !== null ? (parseHttpUrl(link.link)?.href ?? null) : null;
  });

  isMultipleLinks: Signal<boolean> = computed<boolean>(() => (this.previewLinks()?.length ?? 0) > 1);

  isSingleLink: Signal<boolean> = computed<boolean>(() => (this.previewLinks()?.length ?? 0) === 1);

  linkOptions: Signal<IgntButtonDropdownOption<PlanPreviewLink>[]> = computed<IgntButtonDropdownOption<PlanPreviewLink>[]>(() =>
    (this.previewLinks() ?? []).map(link => ({ label: link.name, value: link })),
  );

  onLinkOptionClick(link: PlanPreviewLink): void {
    const safeUrl = parseHttpUrl(link.link)?.href ?? null;
    if (safeUrl !== null) {
      this.#openWithUnsavedGuard(safeUrl);
    }
  }

  onSingleLinkClick(event: Event): void {
    event.preventDefault();
    const safeUrl = this.firstLinkSafeUrl();
    if (safeUrl !== null) {
      this.#openWithUnsavedGuard(safeUrl);
    }
  }

  #openWithUnsavedGuard(url: string): void {
    if (!this.hasUnsavedChanges()()) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    confirmDiscardUnsavedChanges(this.#dialogService, this.#translateService, this.#injector, {
      acceptKey: 'planSetup.previewLinks.unsavedChanges.confirm',
      isDestructive: false,
      messageKey: 'planSetup.previewLinks.unsavedChanges.message',
    })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((discard?: boolean) => {
        if (discard === true) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      });
  }
}
