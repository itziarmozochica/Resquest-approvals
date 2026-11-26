import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { EntryPointClient } from '@fz-original/app/app/enums/entry-point-client.enum';
import { OdooTillLockRedirectService } from '@fz-original/app/core/authentication/odoo-till-lock-redirect.service';
import { OdooTillLockLinkService } from '@fz-original/app/modules/box-office/odoo-food-and-beverage/services/odoo-till-lock-link.service';
import { EntryPointClientService } from '@fz-original/app/shared/services/entry-point-client/entry-point-client.service';
import { IgntButtonComponent, type IgntButtonIcon } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

/**
 * With Odoo as the entry point, the Feverzone login offers the way back to the Odoo point of sale of the selected
 * onsite setup, so an operator who lands here (e.g. a failed hand-off) is not stuck on Feverzone.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, TranslateModule],
  selector: 'app-back-to-odoo-pos-button',
  standalone: true,
  styleUrl: './back-to-odoo-pos-button.component.scss',
  templateUrl: './back-to-odoo-pos-button.component.html',
})
export class BackToOdooPosButtonComponent {
  protected readonly icon: IgntButtonIcon = { name: 'utensils', variant: 'light' };
  readonly #odooTillLockRedirectService = inject(OdooTillLockRedirectService);
  readonly #pointOfSaleLink: string | null = inject(OdooTillLockLinkService).getStoredPointOfSaleLink();
  readonly #entryPointClientService = inject(EntryPointClientService);

  protected readonly isVisible = computed(
    () => this.#entryPointClientService.entryPointClient() === EntryPointClient.Odoo && this.#pointOfSaleLink !== null,
  );

  protected goBackToPointOfSale(): void {
    if (this.#pointOfSaleLink !== null) {
      this.#odooTillLockRedirectService.leaveFor(this.#pointOfSaleLink);
    }
  }
}
