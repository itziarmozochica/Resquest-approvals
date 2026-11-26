import { Component, computed, EventEmitter, inject, input, Output } from '@angular/core';

import { IgntButtonComponent, IgntTooltipDirective, type IgntButtonIcon } from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { OboFlowTypeEnum, OnsiteSetup } from '../../../../modules/box-office/shared/models/onsite-setup';

@Component({
  selector: 'app-onsite-setup-card',
  templateUrl: './onsite-setup-card.component.html',
  styleUrls: ['./onsite-setup-card.component.scss'],
  standalone: true,
  imports: [IgntButtonComponent, IgntIconButtonComponent, TranslateModule, IgntTagComponent, IgntTooltipDirective],
})
export class OnsiteSetupCardComponent {
  #translateService = inject(TranslateService);
  @Output() addCustomTabs = new EventEmitter<OnsiteSetup>();
  @Output() delete = new EventEmitter<OnsiteSetup>();
  @Output() duplicate = new EventEmitter<OnsiteSetup>();
  @Output() edit = new EventEmitter<OnsiteSetup>();
  @Output() editCustomTabs = new EventEmitter<OnsiteSetup>();
  setup = input.required<OnsiteSetup>();
  areActionsDisabled = input<boolean>(false);
  readonly addCustomTabsIcon: IgntButtonIcon = { name: 'plus', variant: 'light' };
  readonly editCustomTabsIcon: IgntButtonIcon = { name: 'edit', variant: 'solid' };
  hasCustomTabsConfigs = computed<boolean>(() => !!this.setup().custom_tabs?.length);
  isActive = input<boolean>(false);
  isHidden = computed<boolean>(() => this.setup().is_hidden === true);
  isMobile = input<boolean>(false);
  isOneStopShopOboFlow = computed<boolean>(() => this.setup().obo_flow_type === OboFlowTypeEnum.one_stop_shop);
  isTablet = input<boolean>(false);
  @Output() openInBoxOffice = new EventEmitter<OnsiteSetup>();
  setupName = computed<string>(() =>
    this.setup().name === 'default' ? this.#translateService.instant('boxOffice.setup.default') : this.setup().name,
  );
  showTabsButtons = computed<boolean>(() => {
    if (this.isMobile() || this.isTablet()) return false;

    const hasRetailSetupLinked = !!this.setup().retail_setup_id;
    return hasRetailSetupLinked && this.isOneStopShopOboFlow();
  });
}
