import { CommonModule } from '@angular/common';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  Output,
  QueryList,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { IgntTabsVariant, IgntTabsVariantET } from '@ignite/legacy/enums/ignt-tabs.enum';

import { IgntTourAnchorDirective } from '../ignt-ui-tour/ignt-tour-anchor.directive';
import { IgntTabsContentComponent } from './ignt-tabs-content/ignt-tabs-content.component';
import { IgntTabsItemComponent } from './ignt-tabs-item/ignt-tabs-item.component';

/**
 * Groups related content into views the user moves between in any order, without leaving the page.
 *
 * ### When to use
 * - Several views of the same subject that the user alternates between freely
 * - Breaking a dense page into sections, so the user finishes the task in one place
 *
 * ### When NOT to use
 * - The user needs to compare information across the groups → tabs make them click back and
 *   forth; show the content side by side instead
 * - Ordered stages the user completes one after another → use [Progress Stepper](?path=/docs/components-navigation-progress-stepper--docs)
 * - Showing where a page sits in a hierarchy → use [Breadcrumb](?path=/docs/components-navigation-breadcrumb--docs)
 *
 * ### Related
 * - [Progress Stepper](?path=/docs/components-navigation-progress-stepper--docs) — linear flows taken one step at a time
 * - [Breadcrumb](?path=/docs/components-navigation-breadcrumb--docs) — hierarchical navigation
 */
@Component({
  selector: 'ignt-tabs',
  templateUrl: './ignt-tabs.component.html',
  styleUrls: ['./ignt-tabs.component.scss'],
  standalone: true,
  imports: [CommonModule, IgntTabsContentComponent, IconsModule, IgntTourAnchorDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IgntTabsComponent implements AfterContentInit {
  #changeDetectorRef = inject(ChangeDetectorRef);
  #destroyRef = inject(DestroyRef);
  @Input() hasExtraLine = true;
  @Input() icon?: IconProp = undefined;
  @Input() keepAlive = false;
  @Input() selectedIndex = 0;
  @Output()
  readonly selectedIndexChange: EventEmitter<number> = new EventEmitter<number>();
  @ContentChildren(IgntTabsItemComponent)
  tabs!: QueryList<IgntTabsItemComponent>;
  @Input() tourAnchorId?: string;
  @Input() variant = IgntTabsVariant[IgntTabsVariant.default] as IgntTabsVariantET;

  changeSelectedIndex(i: number): void {
    if (this.selectedIndex !== i) {
      this.selectedIndex = i;
      this.selectedIndexChange.emit(this.selectedIndex);
      this.#updateActiveTab();
    }
  }

  ngAfterContentInit(): void {
    this.tabs.changes.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.#updateActiveTab());
    this.#updateActiveTab();
  }

  onTabClick(tab: IgntTabsItemComponent, i: number): void {
    tab.tabClick.emit();
    if (tab.isSelectable) {
      this.changeSelectedIndex(i);
    }
  }

  #updateActiveTab(): void {
    setTimeout(() => {
      this.tabs.forEach((tab: IgntTabsItemComponent, i: number) => (tab.isActive = tab.isSelectable && i === this.selectedIndex));
      this.#changeDetectorRef.markForCheck();
    });
  }
}
