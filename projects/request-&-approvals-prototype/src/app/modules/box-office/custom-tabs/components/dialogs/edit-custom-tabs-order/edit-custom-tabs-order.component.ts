import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { CenteredDialogComponent } from '@fz-original/app/shared/components/centered-dialog/centered-dialog.component';
import { VerticalDraggableListComponent } from '@fz-original/app/shared/components/vertical-draggable-list/vertical-draggable-list.component';
import { TranslateModule } from '@ngx-translate/core';

import { parseIconString } from '../../../custom-tabs.util';
import { CustomTab } from '../../../services/onsite-setup-custom-tabs/onsite-setup-custom-tabs.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CenteredDialogComponent, FontAwesomeModule, VerticalDraggableListComponent, TranslateModule],
  selector: 'app-dialog-edit-custom-tabs-order',
  standalone: true,
  styleUrls: ['./edit-custom-tabs-order.component.scss'],
  templateUrl: './edit-custom-tabs-order.component.html',
})
export class DialogEditCustomTabsOrderComponent {
  readonly closed = output<void>();
  readonly initialTabs = input<CustomTab[]>([]);
  readonly isActionButtonDisabled = computed(() => this.#hasNoChanges());
  isTabDisabled = (tab: CustomTab & { disabled?: boolean }): boolean => {
    // TBD: we'll need to implement this based on actual business logic for Tickets & Add ons (could be an array of ids for ex)
    return false;
  };
  readonly isVisible = input.required<boolean>();
  readonly orderedTabs = signal<CustomTab[]>([]);
  readonly submitted = output<CustomTab[]>();

  constructor() {
    effect(() => {
      const isVisible = this.isVisible();
      const tabs = this.initialTabs();
      untracked(() => {
        if (!isVisible) return;

        this.orderedTabs.set([...tabs]);
      });
    });
  }

  dismiss(): void {
    this.orderedTabs.set([]);
    this.closed.emit();
  }

  getIconProp(iconString: string | undefined): IconProp {
    if (!iconString) return ['fal', 'circle'];
    return parseIconString(iconString);
  }

  onItemsReordered(tabs: CustomTab[]): void {
    this.orderedTabs.set(tabs);
  }

  submit(): void {
    if (this.#hasNoChanges()) return;

    this.submitted.emit(this.orderedTabs());
    this.dismiss();
  }

  #hasNoChanges(): boolean {
    const initial = this.initialTabs();
    const ordered = this.orderedTabs();
    return initial.every((tab, index) => {
      const orderedTab = ordered[index];
      if (!orderedTab) return false;

      if (tab.id && orderedTab.id) {
        return tab.id === orderedTab.id;
      }

      if (!tab.id && !orderedTab.id) {
        return tab.name === orderedTab.name && tab.icon === orderedTab.icon && tab.type === orderedTab.type;
      }

      return false;
    });
  }
}
