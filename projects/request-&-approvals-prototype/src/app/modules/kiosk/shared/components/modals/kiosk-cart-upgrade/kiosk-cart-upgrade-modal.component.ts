import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import {
  CartSessionTypeUpgrade,
  computeTotalDelta,
  computeTotalUnits,
  UpgradeCartSession,
} from '../../../../services/cart-upgrades/kiosk-cart-upgrades.models';
import { KioskLanguageService } from '../../../../services/kiosk-language.service';
import { formatCurrencyAmount } from '../../../../utils/currency-locale.util';
import { KioskButtonComponent } from '../../button/kiosk-button.component';
import { IconButtonComponent } from '../../icon-button/icon-button.component';

export type KioskCartUpgradeModalResult = 'add' | 'skip' | 'close';

export interface KioskCartUpgradeModalData {
  upgrade: CartSessionTypeUpgrade;
  cartSessions: UpgradeCartSession[];
}

@Component({
  selector: 'app-kiosk-cart-upgrade-modal',
  templateUrl: './kiosk-cart-upgrade-modal.component.html',
  styleUrls: ['../kiosk-base-modals.styles.scss', './kiosk-cart-upgrade-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, IgntDialogModule, IgntIconComponent, IconButtonComponent, KioskButtonComponent, TranslateModule],
})
export class KioskCartUpgradeModalComponent implements OnInit {
  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<KioskCartUpgradeModalResult>;
  readonly #kioskLanguageService = inject(KioskLanguageService);
  readonly data = inject<KioskCartUpgradeModalData>(IGNT_DIALOG_DATA);

  upgrade!: CartSessionTypeUpgrade;
  totalDelta = 0;
  totalUnits = 0;
  formattedAmount = '';

  ngOnInit(): void {
    this.upgrade = this.data.upgrade;
    this.totalDelta = computeTotalDelta(this.upgrade, this.data.cartSessions);
    this.totalUnits = computeTotalUnits(this.upgrade, this.data.cartSessions);
    this.formattedAmount = formatCurrencyAmount(this.totalDelta, this.upgrade.currency, this.#kioskLanguageService.locale());
  }

  add(): void {
    this.#dialogRef.close('add');
  }

  skip(): void {
    this.#dialogRef.close('skip');
  }

  close(): void {
    this.#dialogRef.close('close');
  }
}
