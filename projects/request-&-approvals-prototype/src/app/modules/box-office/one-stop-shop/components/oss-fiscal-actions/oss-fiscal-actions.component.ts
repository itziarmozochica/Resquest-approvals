import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EfrHealthCheckModalService } from '@fz-original/app/modules/box-office/shared/services/efsta-fiscal/efr-health-check-modal.service';
import { EfstaPosButtonsService } from '@fz-original/app/modules/box-office/shared/services/efsta-fiscal/efsta-pos-buttons.service';
import { ComplianceLogContext } from '@fz-original/app/modules/box-office/shared/services/efsta-fiscal/models/compliance-log.model';
import { EfrHealthErrorCode } from '@fz-original/app/modules/box-office/shared/services/efsta-fiscal/models/efr-health-check.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs';

import { OnsiteSetupsStorageService } from '../../../shared/services/onsite-setups/onsite-setups-storage.service';
import { OssFiscalActionDialogComponent } from './oss-fiscal-action-dialog.component';
import { FiscalActionSource, OssFiscalActionDialogData } from './oss-fiscal-action-dialog.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
  imports: [IgntIconButtonComponent, IgntIconComponent, TranslateModule],
  selector: 'app-oss-fiscal-actions',
  standalone: true,
  styleUrls: ['./oss-fiscal-actions.component.scss'],
  templateUrl: './oss-fiscal-actions.component.html',
})
export class OssFiscalActionsComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialog = inject(Dialog);
  readonly #efrHealthCheckModalService = inject(EfrHealthCheckModalService);
  readonly #elementRef = inject(ElementRef);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #partnerService = inject(PartnerService);
  readonly #posButtonsService = inject(EfstaPosButtonsService);
  readonly #translateService = inject(TranslateService);

  readonly countryCode = input<string>();

  protected menuOpen = signal(false);

  protected onDisableUsbMode(): void {
    this.menuOpen.set(false);
    const ctx = this.#logContext;
    this.#efrHealthCheckModalService
      .ensureHealthy(this.countryCode(), [
        EfrHealthErrorCode.COVER_OPEN,
        EfrHealthErrorCode.PAPER_END,
        EfrHealthErrorCode.FISCAL_DAY_NOT_OPEN,
        EfrHealthErrorCode.Z_REQUIRED,
      ])
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#openActionDialog('oneStopShop.fiscalActions.disableUsb', this.#posButtonsService.disableUsbMode(ctx));
      });
  }

  protected onDocumentClick(event: Event): void {
    if (!(this.#elementRef.nativeElement as Element).contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  protected onEnableUsbMode(): void {
    this.menuOpen.set(false);
    const ctx = this.#logContext;
    this.#efrHealthCheckModalService
      .ensureHealthy(this.countryCode(), [
        EfrHealthErrorCode.COVER_OPEN,
        EfrHealthErrorCode.PAPER_END,
        EfrHealthErrorCode.FISCAL_DAY_NOT_OPEN,
        EfrHealthErrorCode.Z_REQUIRED,
      ])
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#openActionDialog('oneStopShop.fiscalActions.enableUsb', this.#posButtonsService.enableUsbMode(ctx));
      });
  }

  protected onPingNavServer(): void {
    this.menuOpen.set(false);
    const ctx = this.#logContext;
    this.#efrHealthCheckModalService
      .ensureHealthy(this.countryCode(), [
        EfrHealthErrorCode.COVER_OPEN,
        EfrHealthErrorCode.PAPER_END,
        EfrHealthErrorCode.FISCAL_DAY_NOT_OPEN,
        EfrHealthErrorCode.Z_REQUIRED,
      ])
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#openActionDialog('oneStopShop.fiscalActions.pingNav', this.#posButtonsService.pingNavServer(ctx));
      });
  }

  protected onPrintReceiptSummary(): void {
    this.menuOpen.set(false);
    const ctx = this.#logContext;
    this.#efrHealthCheckModalService
      .ensureHealthy(this.countryCode(), [EfrHealthErrorCode.Z_REQUIRED])
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#openActionDialog(
          'oneStopShop.fiscalActions.printReceiptSummary',
          (zIndex: string) => this.#posButtonsService.printDocumentList(zIndex, ctx),
          {
            label: this.#translateService.instant('oneStopShop.fiscalActions.ziLabel'),
            placeholder: this.#translateService.instant('oneStopShop.fiscalActions.ziPlaceholder'),
          },
        );
      });
  }

  protected toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen.update(open => !open);
  }

  get #logContext(): ComplianceLogContext {
    const onsiteSetup = this.#onsiteSetupsStorageService.getConfiguration();
    return {
      country: this.countryCode() ?? onsiteSetup?.place?.country_iso_code_2,
      onsiteSetupId: onsiteSetup?.id,
      partnerId: this.#partnerService.getPartner()?.id,
    };
  }

  #openActionDialog(
    actionLabelKey: string,
    actionSource: FiscalActionSource,
    inputConfig?: OssFiscalActionDialogData['inputConfig'],
  ): void {
    this.#dialog.open<void, OssFiscalActionDialogData>(OssFiscalActionDialogComponent, {
      backdropClass: 'ignt-modal--background-opaque',
      data: { actionLabel: this.#translateService.instant(actionLabelKey), actionSource, inputConfig },
      disableClose: true,
    });
  }
}
