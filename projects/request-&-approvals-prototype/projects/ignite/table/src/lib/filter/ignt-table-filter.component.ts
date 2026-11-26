import type { ComponentType } from '@angular/cdk/portal';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, type TemplateRef } from '@angular/core';

import { IgntButtonComponent, type IgntButtonIcon, type IgntButtonVariant } from '@ignite/common';
import { take } from 'rxjs/operators';

import { IgntDialogService } from '../../../../common/src/lib/dialog/dialog.service';
import type { IgntTableFilterSidePanelConfig } from '../models/ignt-table-filter.model';
import type { IgntTableFilterActiveButtonLabelFn } from '../models/ignt-table-translations';
import { IgntTableTranslationsDirective } from '../table-translations.directive';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent],
  selector: 'ignt-table-filter',
  standalone: true,
  styleUrl: './ignt-table-filter.component.scss',
  templateUrl: './ignt-table-filter.component.html',
})
export class IgntTableFilterComponent {
  readonly #dialogService = inject(IgntDialogService);
  readonly #translations = inject(IgntTableTranslationsDirective).translations;

  readonly sidePanelContent = input.required<ComponentType<unknown> | TemplateRef<unknown>>();
  readonly sidePanelOptions = input.required<IgntTableFilterSidePanelConfig>();
  readonly activeFilterCount = input<number>(0);
  readonly disabled = input<boolean>(false);
  readonly isActive = input<boolean>(false);
  readonly filterClosed = output<unknown>();

  protected readonly buttonVariant = computed<IgntButtonVariant>(() => (this.isActive() ? 'primary' : 'tertiary'));
  protected readonly filterIcon: IgntButtonIcon = { name: 'sliders-h', variant: 'solid' };
  protected readonly filterLabel = computed((): string => {
    const translations = this.#translations();
    const activeFilterCount = this.activeFilterCount();

    if (activeFilterCount <= 0) {
      return translations.filterLabel;
    }

    const resolveActiveFilterButtonLabel: IgntTableFilterActiveButtonLabelFn = translations.filterActiveButtonLabel;

    return resolveActiveFilterButtonLabel(activeFilterCount);
  });

  protected onFilterButtonClick(): void {
    if (this.disabled()) {
      return;
    }
    const dialogRef = this.#dialogService.openSidePanel(this.sidePanelContent() as never, this.sidePanelOptions());
    dialogRef.closed$.pipe(take(1)).subscribe((result: unknown) => {
      this.filterClosed.emit(result);
    });
  }
}
