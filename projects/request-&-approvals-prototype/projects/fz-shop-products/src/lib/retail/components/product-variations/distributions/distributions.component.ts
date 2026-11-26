import { ChangeDetectionStrategy, Component, computed, inject, signal, type OnInit } from '@angular/core';
import { Router, type Params } from '@angular/router';

import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  IGNT_DIALOG_DATA,
  IgntAlertComponent,
  IgntButtonComponent,
  IgntButtonIcon,
  IgntDialogCloseDirective,
  IgntDialogModule,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntLinkComponent } from '@ignite/legacy/components/ignt-link/ignt-link.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';

import type { DistributionsDialogData } from '../../../models/dialog/product-variation/distributions-dialog.model';
import type { DistributionPlan } from '../../../models/product-variations/distributions.model';
import { RetailSetupStore } from '../../../store/retail-setup.store';
import { getNoActiveSessionRunbookUrl } from '../../../utils/product-variations/no-active-session-runbook-url.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-testid]': '"distributions"',
  },
  imports: [
    IgntAlertComponent,
    IgntButtonComponent,
    IgntDialogCloseDirective,
    IgntDialogModule,
    IgntIconComponent,
    IgntLinkComponent,
    IgntTagComponent,
    TranslateModule,
  ],
  selector: 'fz-retail-distributions',
  standalone: true,
  styleUrl: './distributions.component.scss',
  templateUrl: './distributions.component.html',
})
export class DistributionsComponent implements OnInit {
  readonly #router = inject(Router);
  readonly #store = inject(RetailSetupStore);

  protected readonly dialogData = inject<DistributionsDialogData>(IGNT_DIALOG_DATA);

  readonly #currentRetailSetup = computed(() => this.#store.retailSetup());

  protected readonly distribution = computed<DistributionPlan[]>(() => {
    if (!this.#isStoreDataForCurrentVariation()) {
      return [];
    }

    return this.#store.distributions();
  });
  protected readonly isLoading = computed(() => {
    if (this.#currentRetailSetup() === null) {
      return false;
    }

    if (!this.#isStoreDataForCurrentVariation()) {
      return true;
    }

    return this.#store.isLoadingDistributions();
  });
  protected readonly error = computed(() => {
    if (!this.#isStoreDataForCurrentVariation()) {
      return null;
    }

    return this.#store.distributionsError();
  });

  protected readonly planGridColumns = computed(() => {
    const planCount = this.distribution().length;
    if (planCount <= 1) {
      return 1;
    }
    if (planCount === 2) {
      return 2;
    }
    return 3;
  });

  protected readonly copyIcon: IgntButtonIcon = { name: 'copy', variant: 'solid' };
  protected readonly externalLinkIcon: IconProp = ['fal', 'external-link'];
  protected readonly noActiveSessionRunbookUrl = computed(() => getNoActiveSessionRunbookUrl(this.#currentRetailSetup()?.type));
  protected readonly warehouseIcon: IconProp = ['fal', 'warehouse'];

  readonly #selectedPlanId = signal<number | null>(null);

  protected readonly selectedPlan = computed<DistributionPlan | null>(() => {
    const plans = this.distribution();
    if (plans.length === 0) {
      return null;
    }

    const selectedId = this.#selectedPlanId();
    return plans.find(plan => plan.id === selectedId) ?? plans[0];
  });

  ngOnInit(): void {
    const retailSetup = this.#currentRetailSetup();
    if (retailSetup === null) {
      return;
    }

    this.#store.fetchDistributions({
      productVariationId: this.dialogData.productVariationId,
      retailSetupId: retailSetup.id,
    });
  }

  protected copySessionType(sessionTypeId: number): void {
    navigator.clipboard.writeText(String(sessionTypeId)).catch((error: unknown) => {
      console.error('Error copying session type id', error);
    });
  }

  protected goToChannelsSettings(plan: DistributionPlan, channelId = 'box-office'): void {
    this.#openInNewTab(
      ['/channels-settings/ticket-types'],
      {
        channelId,
        cityId: plan.cityId,
        planId: plan.id,
        ticket_type_name: this.dialogData.productVariationName,
      },
      'edit-ticket-types',
    );
  }

  protected goToInventoryPricing(plan: DistributionPlan): void {
    this.#openInNewTab(['/inventory/pricing/overview/matrix'], {
      channels: plan.channels.map(channel => channel.name),
      cityId: plan.cityId,
      planId: plan.id,
      sessionTypeCategories: ['shopProduct'],
      status: 1,
      ticketType: this.dialogData.productVariationName,
      venueId: plan.venueId,
    });
  }

  protected selectPlan(planId: number): void {
    this.#selectedPlanId.set(planId);
  }

  #isStoreDataForCurrentVariation(): boolean {
    return this.#store.selectedProductVariationId() === this.dialogData.productVariationId;
  }

  #openInNewTab(commands: string[], queryParams: Params, fragment?: string): void {
    const url = this.#router.serializeUrl(this.#router.createUrlTree(commands, { fragment, queryParams }));
    window.open(url, '_blank', 'noopener');
  }
}
