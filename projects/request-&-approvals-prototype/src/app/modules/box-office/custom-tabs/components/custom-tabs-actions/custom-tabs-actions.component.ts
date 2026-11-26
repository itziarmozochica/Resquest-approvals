import { ChangeDetectionStrategy, Component, computed, input, InputSignal, output, OutputEmitterRef, Signal } from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { ButtonVariant, IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { OssCustomTabType } from '../../../shared/models/onsite-setup';
import { CustomTabsActionsConfig, CustomTabsActionType, CustomTabsActionTypes } from '../../models/custom-tabs.model';

interface ActionsHeader {
  description: string;
  icon: IconProp;
  title: string;
}

interface ActionButton {
  actionType: CustomTabsActionTypes;
  hidden?: boolean;
  icon: IconProp;
  label: string;
  variant: ButtonVariant;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FontAwesomeModule, IgntButtonComponent, TranslateModule],
  selector: 'app-custom-tabs-actions',
  standalone: true,
  styleUrls: ['./custom-tabs-actions.component.scss'],
  templateUrl: './custom-tabs-actions.component.html',
})
export class CustomTabsActionsComponent {
  buttonClick: OutputEmitterRef<{ actionType: CustomTabsActionTypes; tabIndex: number }> = output<{
    actionType: CustomTabsActionTypes;
    tabIndex: number;
  }>();
  buttons: Signal<ActionButton[]> = computed(() => this.#buildButtons().filter(btn => !btn.hidden));
  config: InputSignal<CustomTabsActionsConfig> = input.required<CustomTabsActionsConfig>();
  header: Signal<ActionsHeader> = computed(() => this.#buildHeader());
  publishClick: OutputEmitterRef<void> = output<void>();

  onButtonClick(actionType: CustomTabsActionTypes): void {
    this.buttonClick.emit({ actionType, tabIndex: this.config().tabIndex });
  }

  onPublishClick(): void {
    this.publishClick.emit();
  }

  #buildButtons(): ActionButton[] {
    const { isEmpty, hasTiles, actionsTitle, tabType } = this.config();
    const isByCategory = tabType === OssCustomTabType.parent_hierarchy_element;
    const isByItems = tabType === OssCustomTabType.specific_items;

    return [
      {
        actionType: CustomTabsActionType.ADD_TAB,
        hidden: !isEmpty,
        icon: ['fal', 'plus'],
        label: 'boxOffice.customTabs.actions.emptyStateAddTabButton',
        variant: 'sharp',
      },
      {
        actionType: CustomTabsActionType.ADD_TAB_ITEMS,
        hidden: isEmpty || isByCategory,
        icon: ['fal', 'plus'],
        label: 'boxOffice.customTabs.actions.addTabItemsButton',
        variant: 'sharp',
      },
      {
        actionType: CustomTabsActionType.EDIT_CATEGORY,
        hidden: isEmpty || isByItems || !hasTiles,
        icon: ['fal', 'repeat'],
        label: 'boxOffice.customTabs.actions.editCategoryButton',
        variant: 'sharp',
      },
      {
        actionType: CustomTabsActionType.EDIT_TAB_INFO,
        hidden: isEmpty || !actionsTitle,
        icon: ['fal', 'edit'],
        label: 'boxOffice.customTabs.actions.editTabInfoButton',
        variant: 'sharp',
      },
      {
        actionType: CustomTabsActionType.ADD_CATEGORY,
        hidden: isEmpty || isByItems || hasTiles,
        icon: ['fal', 'plus'],
        label: 'boxOffice.customTabs.actions.addNewCategoryButton',
        variant: 'sharp',
      },
      {
        actionType: CustomTabsActionType.DELETE_TAB_ITEMS,
        hidden: isEmpty || !hasTiles,
        icon: ['fal', 'trash-alt'],
        label: 'boxOffice.customTabs.actions.deleteTabItemsButton',
        variant: 'danger',
      },
      {
        actionType: CustomTabsActionType.DELETE_TAB,
        hidden: isEmpty,
        icon: ['fal', 'trash-alt'],
        label: 'boxOffice.customTabs.actions.deleteTabButton',
        variant: 'danger',
      },
    ];
  }

  #buildHeader(): ActionsHeader {
    const { isEmpty, hasTiles, actionsTitle, tabType } = this.config();

    if (isEmpty) {
      return {
        description: 'boxOffice.customTabs.noTabs.description',
        icon: ['fal', 'times-circle'],
        title: 'boxOffice.customTabs.noTabs.title',
      };
    }

    if (tabType === OssCustomTabType.parent_hierarchy_element) {
      return {
        description: 'boxOffice.customTabs.categories.description',
        icon: ['fal', 'list-alt'],
        title: actionsTitle || 'boxOffice.customTabs.categories.title',
      };
    }

    return {
      description: 'boxOffice.customTabs.items.description',
      icon: ['fal', 'th-large'],
      title: hasTiles ? 'boxOffice.customTabs.items.title' : 'boxOffice.customTabs.items.emptyTitle',
    };
  }
}
