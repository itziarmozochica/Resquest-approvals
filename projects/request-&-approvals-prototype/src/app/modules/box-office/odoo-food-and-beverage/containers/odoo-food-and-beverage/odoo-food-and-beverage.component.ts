import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, DOCUMENT, inject, Injector, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { TicketingOnsiteSetupStorageService } from '@fz/ticketing';
import { FztOnsiteSetupModalComponent, type FztOnsiteSetupModalData, type FztOnsiteSetupModalResult } from '@fz/ticketing-ui';
import { IgntDialogService } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs';

import {
  ODOO_FNB_RESOLVE_KEY,
  type OdooFnbHandOff,
  type OdooFnbSetupRequiredReason,
} from '../../models/odoo-food-and-beverage-hand-off.model';
import { OdooPosHandoffService } from '../../services/odoo-pos-handoff.service';
import { isPointOfSaleNotFoundError } from '../../utils/point-of-sale-not-found.util';

const TOAST_KEY_BY_REASON: Partial<Record<OdooFnbSetupRequiredReason, string>> = {
  'link-error': 'boxOffice.odooFoodAndBeverage.linkError',
  'pos-not-found': 'boxOffice.odooFoodAndBeverage.posNotFound',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, IgntSkeletonBaseComponent, IgntTabsComponent, IgntTabsItemComponent, TranslateModule],
  selector: 'app-odoo-food-and-beverage',
  standalone: true,
  styleUrls: ['./odoo-food-and-beverage.component.scss'],
  templateUrl: './odoo-food-and-beverage.component.html',
})
export class OdooFoodAndBeverageComponent implements OnInit {
  readonly #breakpointStateService = inject(BreakpointStateService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #document = inject(DOCUMENT);
  readonly #injector = inject(Injector);
  readonly #partnerService = inject(PartnerService);
  readonly #posHandoffService = inject(OdooPosHandoffService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #spinnerService = inject(SpinnerService);
  readonly #storageService = inject(TicketingOnsiteSetupStorageService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);

  readonly #isMobile = this.#breakpointStateService.getStateProp('isMobile');
  readonly #isTablet = this.#breakpointStateService.getStateProp('isTablet');

  ngOnInit(): void {
    const handOff: OdooFnbHandOff | undefined = this.#route.snapshot.data[ODOO_FNB_RESOLVE_KEY];

    if (handOff === undefined || handOff.kind === 'redirecting') {
      return;
    }

    afterNextRender(() => this.#requireSetup(handOff.reason), { injector: this.#injector });
  }

  #handOff(): void {
    const onsiteSetup = this.#storageService.getOnsiteSetupConfig();
    const channelId = onsiteSetup?.channel_id;
    const partnerId = this.#partnerService.getPartner()?.id;

    if (!channelId || partnerId === undefined) {
      this.#requireSetup('link-error');

      return;
    }

    this.#spinnerService.show();

    this.#posHandoffService
      .resolveRedirectUrl(channelId, onsiteSetup?.id, partnerId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (error: unknown) => this.#requireSetup(isPointOfSaleNotFoundError(error) ? 'pos-not-found' : 'link-error'),
        next: (redirectUrl: string) => this.#document.defaultView?.location.replace(redirectUrl),
      });
  }

  #openSetupModal(partnerId: string): void {
    const data: FztOnsiteSetupModalData = {
      hasActiveShiftAndActiveOnsiteSetup: false,
      hasCloseButton: true,
      isMobileOrTablet: this.#isMobile() || this.#isTablet(),
      partnerId,
      userName: this.#userService.getUser()?.name ?? null,
    };

    this.#dialogService
      .openModal<FztOnsiteSetupModalResult, FztOnsiteSetupModalData>(FztOnsiteSetupModalComponent, {
        data,
        disableCloseShortcuts: false,
        injector: this.#injector,
        size: 'md',
      })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((selection: FztOnsiteSetupModalResult | undefined) => {
        if (selection === undefined) {
          this.#router.navigate(['/box-office'], { replaceUrl: true });

          return;
        }

        this.#handOff();
      });
  }

  #requireSetup(reason: OdooFnbSetupRequiredReason): void {
    this.#spinnerService.hide();

    const partnerId = this.#partnerService.getPartner()?.id;

    if (partnerId === undefined) {
      this.#toast('link-error');
      this.#router.navigate(['/box-office'], { replaceUrl: true });

      return;
    }

    this.#toast(reason);
    this.#openSetupModal(String(partnerId));
  }

  #toast(reason: OdooFnbSetupRequiredReason): void {
    const key = TOAST_KEY_BY_REASON[reason];

    if (key === undefined) {
      return;
    }

    this.#toastService.addWarning(this.#translateService.instant(key));
  }
}
