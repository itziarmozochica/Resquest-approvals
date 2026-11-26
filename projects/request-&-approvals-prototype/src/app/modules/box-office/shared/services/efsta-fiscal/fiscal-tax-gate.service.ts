import { inject, Injectable, Injector, signal } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { CartService } from '@fz-original/app/shared/services/cart/cart.service';
import { IGNT_DIALOG_TRANSLATIONS, IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { catchError, map, Observable, of } from 'rxjs';

import { resolvePlTaxGroupByRate } from './efsta-esr-mapper-pl.util';
import { resolveHungarianTaxGroupByRate } from './efsta-esr-mapper.util';
import { resolveFiscalCountryProfile } from './fiscal-country-profile.util';
import { findFiscalTaxBlockers, FiscalTaxBlocker, TaxGroupByRateResolver } from './fiscal-tax-gate.util';
import { buildComplianceLog } from './models/compliance-log.model';
import { FiscalCountryCode, FiscalMapperVariant } from './models/fiscal-country-profile.model';

interface FiscalTaxGateCountry {
  readonly countryCode: FiscalCountryCode;
  readonly messageKey: string;
  readonly resolveTaxGroupByRate: TaxGroupByRateResolver;
  readonly titleKey: string;
  readonly unavailableMessageKey: string;
}

const FISCAL_TAX_GATE_BY_MAPPER: Readonly<Record<FiscalMapperVariant, FiscalTaxGateCountry>> = {
  hungary: {
    countryCode: 'HU',
    messageKey: 'boxOffice.fiscal.huMissingTaxRate.message',
    resolveTaxGroupByRate: resolveHungarianTaxGroupByRate,
    titleKey: 'boxOffice.fiscal.huMissingTaxRate.title',
    unavailableMessageKey: 'boxOffice.fiscal.huMissingTaxRate.unavailableMessage',
  },
  poland: {
    countryCode: 'PL',
    messageKey: 'boxOffice.fiscal.plMissingTaxRate.message',
    resolveTaxGroupByRate: resolvePlTaxGroupByRate,
    titleKey: 'boxOffice.fiscal.plMissingTaxRate.title',
    unavailableMessageKey: 'boxOffice.fiscal.plMissingTaxRate.unavailableMessage',
  },
};

type FiscalTaxCheck = { blockers: FiscalTaxBlocker[]; kind: 'checked' } | { details: string; kind: 'unavailable' };

@Injectable({
  providedIn: 'root',
})
export class FiscalTaxGateService {
  readonly #cartService = inject(CartService);
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #dialogService = inject(IgntDialogService);
  readonly #injector = inject(Injector);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #translate = inject(TranslateService);

  guardPurchase(countryCode: string | undefined, partnerId: number | undefined, cartId: string | null | undefined): Observable<boolean> {
    const mapper = resolveFiscalCountryProfile(this.#optimizelyService, countryCode)?.mapper;
    if (mapper == null || partnerId == null || cartId == null) {
      return of(true);
    }
    const gate = FISCAL_TAX_GATE_BY_MAPPER[mapper];

    return this.#cartService.getCartFiscalLines(partnerId, cartId).pipe(
      map((items): FiscalTaxCheck => ({ blockers: findFiscalTaxBlockers(items, gate.resolveTaxGroupByRate), kind: 'checked' })),
      catchError((error: unknown) =>
        of<FiscalTaxCheck>({ details: error instanceof Error ? error.message : String(error), kind: 'unavailable' }),
      ),
      map((check: FiscalTaxCheck) => {
        if (check.kind === 'checked' && check.blockers.length === 0) {
          return true;
        }
        this.#reportBlockedSale(gate, partnerId, cartId, check);
        return false;
      }),
    );
  }

  #reportBlockedSale(gate: FiscalTaxGateCountry, partnerId: number, cartId: string, check: FiscalTaxCheck): void {
    const { countryCode } = gate;
    const isUnavailable = check.kind === 'unavailable';
    this.#datadogLogService.logError(
      isUnavailable
        ? `EFSTA ${countryCode} sale blocked before payment - tax rates unavailable`
        : `EFSTA ${countryCode} sale blocked before payment - missing tax rate`,
      buildComplianceLog(
        'registration',
        { country: countryCode, partnerId },
        {
          details: isUnavailable ? `cartId:${cartId} ${check.details}` : `cartId:${cartId} ${JSON.stringify(check.blockers)}`,
          errorCode: isUnavailable ? `EFR_${countryCode}_TAX_RATES_UNAVAILABLE` : `EFR_${countryCode}_MISSING_TAX_GROUP`,
        },
      ),
    );

    const okButton = this.#translate.instant('common.accept');
    this.#dialogService.openMessageModal(
      this.#translate.instant(gate.titleKey),
      this.#translate.instant(isUnavailable ? gate.unavailableMessageKey : gate.messageKey),
      {
        injector: Injector.create({
          parent: this.#injector,
          providers: [{ provide: IGNT_DIALOG_TRANSLATIONS, useValue: signal({ okButton }) }],
        }),
      },
    );
  }
}
