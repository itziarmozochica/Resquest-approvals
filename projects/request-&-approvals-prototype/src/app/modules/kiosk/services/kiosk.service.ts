import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { AdyenConfiguration } from '@fz-original/app/app/models/payment-checkout-adyen.model';
import { PayhereConfiguration } from '@fz-original/app/app/models/payment-checkout-payhere.model';
import { DatadogLogLevel, DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { KioskOnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/kiosk-onsite-setup';
import { OnsiteSetupsService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups.service';
import { PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import { PaymentConfigStorageService } from '@fz-original/app/modules/box-office/shared/services/payment/payment-config-storage.service';
import { KioskCategoryGroup, KioskGroupedPlansResponse } from '@fz-original/app/modules/kiosk/models/kiosk-category-group.model';
import { KioskConfiguration } from '@fz-original/app/modules/kiosk/models/kiosk-configuration';
import { KioskPlanDetail, KioskPlanItem, KioskPlansResponse } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';
import { KioskCacheService, RequestCacheParams } from '@fz-original/app/modules/kiosk/services/cache/kiosk-cache.service';
import { KioskConfigurationAdapter } from '@fz-original/app/modules/kiosk/services/kiosk-configuration.adapter';
import { KioskConfigurationsAdapter } from '@fz-original/app/modules/kiosk/services/kiosk-configurations.adapter';
import { KioskStateService } from '@fz-original/app/modules/kiosk/services/kiosk-state/kiosk-state.service';
import { KioskStorageService } from '@fz-original/app/modules/kiosk/services/kiosk-storage.service';
import { getKioskChannelId } from '@fz-original/app/modules/kiosk/utils/kiosk-ch.util';
import { KioskDTO } from '@fz-original/app/modules/settings/kiosk/services/kiosk.dto';
import { KioskForm } from '@fz-original/app/modules/settings/kiosk/services/kiosk.form';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { LinkPaginationResponse } from '@fz-original/app/shared/models/link-pagination-response';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { AppVersionService } from '@fz-original/app/shared/services/app-version/app-version.service';
import { ReloadTiming } from '@fz-original/app/shared/services/app-version/reload-timing.enum';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { Channel } from '@fz-original/app/shared/services/session-availability/channel.enum';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import type { VersionJson } from '@fz/version-check';
import { TranslateService } from '@ngx-translate/core';
import { saveAs } from 'file-saver';
import { EMPTY, forkJoin, Observable, throwError, timer } from 'rxjs';
import { QueueAction } from 'rxjs/internal/scheduler/QueueAction';
import { QueueScheduler } from 'rxjs/internal/scheduler/QueueScheduler';
import { catchError, expand, map, reduce, retry, switchMap, tap } from 'rxjs/operators';

/**
 * @todo
 *
 * * Move this interface to a `*.model.ts` file.
 * * Re-arrange class members and make private ones natively private.
 * * Create new private methods to split the too big ones.
 * * Move this service and the kiosk storage one to their own folders.
 * * Move contents of `src/app/modules/settings/kiosk` to `src/app/modules/kiosk` where it corresponds.
 */

interface KioskConfigurationsQuery {
  itemsPerPage: number;
  page: number;
  partnerId: number;
  placeId?: number;
  cityId?: number;
}

/**
 * Discriminated union returned by {@link KioskService.fetchPlansForCurrentVariant}.
 * The home component renders one or the other based on the `kind` tag.
 */
export type KioskPlansResult = { kind: 'plans'; payload: KioskPlanItem[] } | { kind: 'groups'; payload: KioskCategoryGroup[] };

@Injectable({
  providedIn: 'root',
})
export class KioskService {
  static readonly homeDataStaleForSeconds = 24 * 60 * 60;
  static readonly maxPlansPerRequest = 10;
  static readonly planDetailStaleForSeconds = 24 * 60 * 60;
  static readonly plansPerSectionPreview = 3;
  static readonly plansPerSectionWithSoldOutHidden = 10;

  readonly #appVersion = inject(AppVersionService);
  #datadogService = inject(DatadogLogService);
  readonly #fifteenMins = 15 * 60 * 1000;
  #http = inject(HttpClient);
  #kioskCacheService = inject(KioskCacheService);
  #kioskConfigurationAdapter = inject(KioskConfigurationAdapter);
  #kioskConfigurationsAdapter = inject(KioskConfigurationsAdapter);
  #kioskStateService = inject(KioskStateService);
  #kioskStorageService = inject(KioskStorageService);
  #onsiteSetupsService = inject(OnsiteSetupsService);
  readonly #optimizelyService = inject(OptimizelyService);
  #partnerService = inject(PartnerService);
  #paymentConfigStorageService = inject(PaymentConfigStorageService);
  #translateService = inject(TranslateService);

  createKiosk(organizationId: number, form: KioskForm): Observable<BaseResponse<KioskDTO | null>> {
    const path = this.#createKioskUrl(organizationId);

    return this.#http.post(path, this.#mapCreateForm(form), { observe: 'response' }).pipe(
      map((response: HttpResponse<{ data?: KioskDTO; error?: { code: string; message: string } }>) => {
        if (response.status === 200) {
          return new BaseResponse(response.body?.data ?? null, null);
        }
        let error = null;
        if (response.body?.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return new BaseResponse(null, error);
      }),
      catchError(error => throwError(() => new BaseResponse(null, ErrorResponseUtils.getErrorResponseError(error)))),
    );
  }

  /**
   * Bootstraps the kiosk data layer: fetches the kiosk configuration by
   * serial, then the onsite setup that configuration points at, and flips
   * `kioskDataReady` so anything gated on bootstrap completion (PayHere
   * pairing, the home component's loadInitial) can fire.
   *
   * Plans are intentionally **not** fetched here. They depend on the
   * onsite setup (language) and are issued by the home component via
   * {@link fetchPlansForCurrentVariant}, which knows whether to hit v1
   * or v2 based on the configuration. Keeping plans out of the bootstrap
   * means the boot path issues each endpoint exactly once.
   */
  getKioskConfigAndSetup({
    errorCallback,
    partnerId,
    serial,
  }: {
    errorCallback?: (error: { message?: string } | null) => void;
    partnerId?: number;
    serial?: string;
  }): Observable<KioskOnsiteSetup | never> {
    this.logTrace('Getting kiosk config + onsite setup', DatadogLogLevel.Info);
    const _partnerId: number | undefined = partnerId ?? this.#partnerService.getPartner()?.id;
    const kioskSerial: string | undefined = serial ?? this.#kioskStorageService.getConfiguration()?.serial;
    if (_partnerId === undefined) {
      throw new Error('Trying to get or update kiosk data but the partner id is undefined');
    }
    if (kioskSerial === undefined) {
      throw new Error('Trying to get or update kiosk data but the serial is undefined');
    }
    return this.getKioskConfiguration(_partnerId, kioskSerial).pipe(
      switchMap(({ data: kioskConfiguration, error }) => {
        if (error !== null && error.message !== undefined) {
          this.logTrace(error.message, DatadogLogLevel.Warn);
          if (errorCallback !== undefined) {
            errorCallback(error);
          }
          return EMPTY;
        }
        if (kioskConfiguration === null) {
          this.logTrace('Kiosk configuration is null, cannot proceed with setup', DatadogLogLevel.Error);
          return EMPTY;
        }
        this.logTrace('Kiosk configuration loaded, fetching onsite setup', DatadogLogLevel.Info, {
          kiosk_id: kioskConfiguration.id,
          kiosk_variant: kioskConfiguration.dataSourceId ? 'v2' : 'v1',
        });
        return this.getOnsiteSetup(kioskConfiguration).pipe(
          tap(() => {
            this.logTrace('Onsite setup loaded, kiosk bootstrap complete', DatadogLogLevel.Info, { kiosk_id: kioskConfiguration.id });
            this.#kioskStateService.updateStateProp('kioskDataReady', true);
          }),
        );
      }),
    );
  }

  updateKiosk(
    partnerId: number,
    serial: string,
    form: KioskForm,
    previousDataSourceId: string | null = null,
  ): Observable<BaseResponse<null>> {
    const path = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/kiosks/${serial}`;

    return this.#http.put<BaseResponse<null>>(path, this.#mapUpdateForm(form, previousDataSourceId), { observe: 'response' }).pipe(
      map((response: HttpResponse<BaseResponse<null>>) => {
        if (response.status === 204) {
          return new BaseResponse(null, null);
        }
        let error = null;
        if (response.body?.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return new BaseResponse(null, error);
      }),
      catchError(error => throwError(() => new BaseResponse(null, ErrorResponseUtils.getErrorResponseError(error)))),
    );
  }

  #mapCreateForm(data: KioskForm): KioskDTO {
    const dataSourceId = data.dataSourceId?.trim() || null;
    const dto = this.#mapFormBase(data);
    // On create the backend only needs `data_source_id` when there is a binding;
    // otherwise omit it to keep the create payload minimal.
    if (dataSourceId !== null) {
      dto.data_source_id = dataSourceId;
    }
    return dto;
  }

  #mapUpdateForm(data: KioskForm, previousDataSourceId: string | null): KioskDTO {
    const dataSourceId = data.dataSourceId?.trim() || null;
    const dto = this.#mapFormBase(data);
    // Update is delta-based: only send `data_source_id` when it actually changes,
    // so the backend treats "unchanged" and "set to null" as distinct operations.
    if (dataSourceId !== previousDataSourceId) {
      dto.data_source_id = dataSourceId;
    }
    return dto;
  }

  #mapFormBase(data: KioskForm): KioskDTO {
    return {
      payment_terminal_id: data.paymentTerminalId,
      payment_terminal_ip: data.paymentTerminalIp === '' ? null : data.paymentTerminalIp,
      subscription_channel_id: null,
      name: data.name ?? '',
      plan_ids: data.plans.length > 0 ? data.plans.map(plan => plan.id) : [],
      onsite_setup_id: data.onsiteSetup.id,
    };
  }

  getKioskConfiguration(partnerId: number, serial: string): Observable<BaseResponse<KioskConfiguration | null>> {
    const path = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/kiosks/${serial}`;
    const cacheParams = { url: path };
    return this.#kioskCacheService.getWithRevalidate<BaseResponse<KioskConfiguration | null>>(cacheParams, () =>
      this.#http.get(path, { observe: 'response' }).pipe(
        map(result => this.#kioskConfigurationAdapter.fromApi(result)),
        tap(response => {
          const { data: config, error } = response;
          if (error) {
            this.#datadogService.logWarn(
              `Kiosk ${serial}: Failed to load configuration. Code: ${error.code}, Error: ${error.message}. Data ${config}`,
            );
            throw ErrorResponseUtils.getErrorResponse<KioskConfiguration>(error);
          } else if (config) {
            this.#kioskStorageService.setConfiguration(config);
          }
        }),
        catchError(error => {
          this.#datadogService.logWarn(`Kiosk ${serial}: Failed to load configuration`);
          return ErrorResponseUtils.getErrorResponse<KioskConfiguration>(error);
        }),
      ),
    );
  }

  getKioskConfigurations(query: KioskConfigurationsQuery): Observable<LinkPaginationResponse<KioskConfiguration[]> | BaseResponse<null>> {
    const path = `${environment.apiGWBaseUrl}/1.0/partners/${query.partnerId}/kiosks`;

    return this.#http.get(path, { observe: 'response', params: this.#getParameters(query) }).pipe(
      map(result => this.#kioskConfigurationsAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorResponse<LinkPaginationResponse<KioskConfiguration[]>>(error)),
    );
  }

  getKioskPlanDetail(
    planId: string,
    lang: string = this.#translateService.currentLang,
    channelId?: string | null,
    options?: { fresh?: boolean },
  ): Observable<KioskPlanDetail> {
    const request = this.#planDetailRequest(planId, lang, channelId);
    if (request === null) {
      return throwError(() => new Error(`Cannot fetch kiosk plan detail for plan ${planId}: missing partner id`));
    }
    const planDetail$ = options?.fresh
      ? this.#kioskCacheService.fetchAndCache(request.cacheParams, request.fetch)
      : this.#kioskCacheService.getWithRevalidate(request.cacheParams, request.fetch, undefined, KioskService.planDetailStaleForSeconds);
    return planDetail$.pipe(tap(planDetail => this.#kioskStorageService.setPlan(planDetail)));
  }

  prefetchKioskPlanDetail(planId: string, lang: string, channelId?: string | null, revalidateExpired: boolean = false): void {
    const request = this.#planDetailRequest(planId, lang, channelId);
    if (request === null) {
      return;
    }
    const staleForSeconds = revalidateExpired ? 0 : KioskService.planDetailStaleForSeconds;
    this.#kioskCacheService.warm(request.cacheParams, request.fetch, undefined, staleForSeconds).subscribe();
  }

  #planDetailRequest(
    planId: string,
    lang: string,
    channelId?: string | null,
  ): { cacheParams: RequestCacheParams; fetch: () => Observable<KioskPlanDetail> } | null {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) {
      return null;
    }
    const headers = new HttpHeaders({ 'Accept-Language': lang });
    const channelParam = getKioskChannelId(channelId) ?? Channel.Kiosk;
    const path = this.#getB2bDetailUrl(planId, partnerId);
    const params = new HttpParams().set('channel', channelParam);
    return {
      cacheParams: { language: lang, queryParams: params, url: path },
      fetch: () =>
        this.#http
          .get<BaseResponse<KioskPlanDetail | null>>(path, { headers, params })
          .pipe(map(response => this.#unwrapPlanDetail(response, planId))),
    };
  }

  #getParameters(parameters: KioskConfigurationsQuery): HttpParams {
    let params = new HttpParams();
    params = params.set('items_per_page', parameters.itemsPerPage?.toString() ?? '15');
    params = params.set('page', parameters.page?.toString() ?? '1');
    if (parameters.placeId) {
      params = params.set('place_id', parameters.placeId.toString());
    }
    if (parameters.cityId) {
      params = params.set('city_id', parameters.cityId.toString());
    }
    return params;
  }

  #createKioskUrl(organizationId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${organizationId}/kiosks`;
  }

  getOnsiteSetup(config: KioskConfiguration): Observable<KioskOnsiteSetup> {
    if (!config) {
      throw new Error('Cannot get onsite setup: configuration is null or undefined');
    }

    const simplifiedPath = `onsite-setups/${config.onsiteSetupId}`;
    const cacheParams = { url: simplifiedPath };
    return this.#kioskCacheService.getWithRevalidate<KioskOnsiteSetup>(
      cacheParams,
      () =>
        this.#onsiteSetupsService.getOnsiteSetup(config.onsiteSetupId).pipe(
          map(onsiteSetup => {
            return onsiteSetup as unknown as KioskOnsiteSetup;
          }),
          tap(kioskSetup => {
            this.#kioskStorageService.setOnsiteSetup(kioskSetup);
            this.#storePaymentConfiguration(config, kioskSetup);
          }),
        ),
      undefined,
      KioskService.homeDataStaleForSeconds,
    );
  }

  #storePaymentConfiguration(config: KioskConfiguration, kioskSetup: KioskOnsiteSetup) {
    const paymentTerminalId = config.paymentTerminalId;
    let paymentConfiguration;
    if (kioskSetup.kiosk_payment_gateway === 'payhere') {
      paymentConfiguration = new PaymentConfiguration(null, null, null, new PayhereConfiguration([paymentTerminalId]), paymentTerminalId);
    } else {
      paymentConfiguration = new PaymentConfiguration(new AdyenConfiguration([paymentTerminalId]), null, null, null, paymentTerminalId);
    }
    this.#paymentConfigStorageService.setConfiguration(paymentConfiguration);
  }

  getKioskPlans(plansId: number[], partnerId: number, currentLang: string, channelId?: string | null): Observable<KioskPlanItem[]> {
    const normalizedChannelId = getKioskChannelId(channelId);
    if (normalizedChannelId === undefined) {
      return this.#getKioskPlansByPlansId(plansId, partnerId, currentLang);
    }
    return this.#getKioskPlansByChannel(partnerId, currentLang, normalizedChannelId);
  }

  #getKioskPlansByPlansId(plansId: number[], partnerId: number, currentLang: string): Observable<KioskPlanItem[]> {
    if (plansId.length > KioskService.maxPlansPerRequest) {
      const chunks = this.#generateKioskPlansChunks(plansId, KioskService.maxPlansPerRequest);
      const parallelRequests = chunks.map(chunk => this.#getKioskPlansChunkRaw(chunk, partnerId, currentLang));

      return forkJoin(parallelRequests).pipe(map(responses => responses.flat()));
    }

    return this.#getKioskPlansChunkRaw(plansId, partnerId, currentLang);
  }

  #getKioskPlansChunkRaw(plansId: number[], partnerId: number, currentLang: string): Observable<KioskPlanItem[]> {
    const path: string = this.#getPlansUrl(partnerId);
    const headers = new HttpHeaders({ 'Accept-Language': currentLang });
    let params = new HttpParams();
    plansId.forEach((id: number) => (params = params.append('plan_ids', id)));
    return this.#http.get<KioskPlansResponse>(path, { headers, params }).pipe(map(({ data: plans }) => plans));
  }

  #getKioskPlansByChannel(partnerId: number, currentLang: string, channelId: string): Observable<KioskPlanItem[]> {
    return this.#getKioskPlansPageByChannel(partnerId, currentLang, channelId, 1).pipe(
      expand(({ nextPage }) => (nextPage ? this.#getKioskPlansPageByChannel(partnerId, currentLang, channelId, nextPage) : EMPTY)),
      map(({ plans }) => plans),
      reduce((acc: KioskPlanItem[], plans: KioskPlanItem[]) => [...acc, ...plans], []),
    );
  }

  #getKioskPlansPageByChannel(
    partnerId: number,
    currentLang: string,
    channelId: string,
    page: number,
  ): Observable<{ plans: KioskPlanItem[]; nextPage: number | null }> {
    const path = this.#getPlansUrl(partnerId);
    const headers = new HttpHeaders({ 'Accept-Language': currentLang });
    const params = new HttpParams()
      .append('channel_id', channelId)
      .append('page', page.toString())
      .append('items_per_page', KioskService.maxPlansPerRequest.toString());

    return this.#http.get<KioskPlansResponse>(path, { headers, params, observe: 'response' }).pipe(
      map(response => {
        const plans = response.body?.data ?? [];
        const linkHeader = response.headers.get('Link');
        const nextPage = this.#parseNextPageFromLinkHeader(linkHeader);
        return { plans, nextPage };
      }),
    );
  }

  #parseNextPageFromLinkHeader(linkHeader: string | null): number | null {
    if (!linkHeader) return null;

    const nextLinkMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (!nextLinkMatch) return null;

    const nextUrl = nextLinkMatch[1];
    const pageMatch = nextUrl.match(/[?&]page=(\d+)(?:&|$)/);
    return pageMatch ? Number(pageMatch[1]) : null;
  }

  #generateKioskPlansChunks(array: number[], chunkSize: number): number[][] {
    const chunks: number[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  #getPlansUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/kiosks/plans`;
  }

  #getGroupedPlansUrl(partnerId: number, kioskId: string): string {
    return `${environment.apiGWBaseUrl}/2.0/partners/${partnerId}/kiosks/${kioskId}/plans`;
  }

  getKioskGroupedPlans(
    partnerId: number,
    kioskId: string,
    currentLang: string,
    plansPerSection?: number,
    categoryId?: string,
  ): Observable<KioskCategoryGroup[]> {
    const path = this.#getGroupedPlansUrl(partnerId, kioskId);
    const headers = new HttpHeaders({ 'Accept-Language': currentLang });
    let params = new HttpParams();
    if (plansPerSection !== undefined) {
      params = params.append('plans_per_section', plansPerSection.toString());
    }
    if (categoryId !== undefined) {
      params = params.append('category_id', categoryId);
    }

    return this.#http.get<KioskGroupedPlansResponse>(path, { headers, params }).pipe(map(response => response.data ?? []));
  }

  #unwrapPlanDetail(response: BaseResponse<KioskPlanDetail | null>, planId: string): KioskPlanDetail {
    if (response.data == null) {
      this.logTrace('Empty b2b kiosk plan-detail envelope', DatadogLogLevel.Warn, {
        error_code: response.error?.code ?? null,
        error_message: response.error?.message ?? null,
        plan_id: planId,
      });
      throw new Error(
        `Empty b2b kiosk plan-detail envelope for plan ${planId} (${response.error?.code ?? 'unknown'}: ${response.error?.message ?? 'no message'})`,
      );
    }
    return response.data;
  }

  #getB2bDetailUrl(planId: string, partnerId: number): string {
    return `${environment.apiGWBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/kiosk`;
  }

  checkForUpdates(): Observable<boolean> {
    return this.timeAndRetry(0).pipe(
      switchMap(() => this.#appVersion.fetchVersionToReloadFor()),
      map((published: VersionJson | null) => published !== null && this.#reloadFor(published)),
    );
  }

  #reloadFor(published: VersionJson): boolean {
    const isReloading = this.#appVersion.reloadOnce(published, ReloadTiming.Immediate);
    if (isReloading) {
      this.logTrace('Outdated. Updating to a newer version', DatadogLogLevel.Info, {
        published_hash: published.hash,
        published_version: published.version,
        running_version: AppVersionService.runningVersion,
      });
    }
    return isReloading;
  }

  downloadKioskPropertiesFile(serial: string, name: string, apiKey: string, partnerId: number): void {
    const content = `auth=${apiKey}\nserial=${serial}\nname=${name}\ngroup=kiosks-${partnerId}`;
    const blob = new Blob([content], { type: 'text/plain' });
    saveAs(blob, 'kiosk.properties');
  }

  logTrace(message: string, level: string, payload: object = {}): void {
    const serial: string | undefined = this.#kioskStorageService.getConfiguration()?.serial;
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;

    const default_payload = {
      serial,
      host: serial,
      group: `kiosks-${partnerId}`,
      ...payload,
    };
    if (level === DatadogLogLevel.Error) {
      this.#datadogService.logError(`Kiosk ${serial}: ${message}`, default_payload);
    } else if (level === DatadogLogLevel.Warn) {
      this.#datadogService.logWarn(`Kiosk ${serial}: ${message}`, default_payload);
    } else if (level === DatadogLogLevel.Info) {
      this.#datadogService.logInfo(`Kiosk ${serial}: ${message}`, default_payload);
    }
  }

  /**
   * sold-out (`is_purchasable === false`) plans are hidden according to the
   * `kiosk_screen_saver` Optimizely flag until the behaviour becomes
   * configurable. Only an explicit `false` hides a plan: a payload missing the
   * field stays visible, so a degraded backend can never blank the kiosk.
   * Groups left with no plans are dropped so the home renders no
   * empty category rows. Applied at read time (after the cache) so the cache keeps
   * raw responses.
   */
  excludeSoldOutGroups(groups: KioskCategoryGroup[]): KioskCategoryGroup[] {
    if (!this.#isSoldOutHidden()) {
      return groups;
    }
    return groups
      .map(group => ({ ...group, plans: group.plans.filter(plan => plan.is_purchasable !== false) }))
      .filter(group => group.plans.length > 0);
  }

  /**
   * Single decision point for the v1 vs v2 plans fetch.
   *
   * Reads the cached configuration + partner and routes to either the v1
   * `getKioskPlans` endpoint (legacy kiosks, `plan_ids` payload) or the v2
   * `getKioskGroupedPlans` endpoint (kiosks with a `dataSourceId`). Every
   * caller — home component, language change, scheduled refresh — should go
   * through this method so the v1/v2 routing rule lives in exactly one place.
   *
   * Throws synchronously when the kiosk configuration or partner is missing
   * from storage, matching the existing `loadForLanguage` precedent.
   */
  fetchPlansForCurrentVariant(lang: string): Observable<KioskPlansResult> {
    const configuration = this.#kioskStorageService.getConfiguration();
    const partner = this.#partnerService.getPartner();
    if (configuration === null || partner === null) {
      this.logTrace('fetchPlansForCurrentVariant: missing configuration or partner, skipping', DatadogLogLevel.Warn, {
        has_configuration: configuration !== null,
        has_partner: partner !== null,
      });
      return EMPTY;
    }
    const cacheParams = { url: `kiosk-plans-for-variant/${configuration.id}`, language: lang };
    return this.#kioskCacheService
      .getWithRevalidate<KioskPlansResult>(
        cacheParams,
        () => this.#fetchPlansForCurrentVariantRaw(configuration, partner.id, lang),
        undefined,
        KioskService.homeDataStaleForSeconds,
      )
      .pipe(map(result => this.#withoutSoldOutPlans(result)));
  }

  #fetchPlansForCurrentVariantRaw(configuration: KioskConfiguration, partnerId: number, lang: string): Observable<KioskPlansResult> {
    if (configuration.dataSourceId) {
      this.logTrace('Fetching v2 grouped plans', DatadogLogLevel.Info, { kiosk_id: configuration.id, lang });
      // Over-fetch per section while hiding sold-out plans, so filtered previews can still fill up to 3.
      const plansPerSection = this.#isSoldOutHidden() ? KioskService.plansPerSectionWithSoldOutHidden : undefined;
      return this.getKioskGroupedPlans(partnerId, configuration.id, lang, plansPerSection).pipe(
        tap(groups => this.logTrace('v2 grouped plans loaded', DatadogLogLevel.Info, { groups_count: groups.length })),
        map(groups => ({ kind: 'groups' as const, payload: groups })),
      );
    }
    this.logTrace('Fetching v1 plans', DatadogLogLevel.Info, {
      kiosk_id: configuration.id,
      lang,
      plan_ids_count: configuration.plan_ids?.length ?? 0,
    });
    return this.getKioskPlans(configuration.plan_ids, partnerId, lang, configuration.channelId).pipe(
      tap(plans => this.logTrace('v1 plans loaded', DatadogLogLevel.Info, { plans_count: plans.length })),
      map(plans => ({ kind: 'plans' as const, payload: plans })),
    );
  }

  timeAndRetry(startDue: number = this.#fifteenMins): Observable<number> {
    return timer(startDue, this.#fifteenMins, new QueueScheduler(QueueAction)).pipe(
      retry({
        delay: (_error, retryIndex) => {
          const delay: number = Math.pow(2, retryIndex - 1) * 2000;
          this.logTrace(`Failed to refresh. Retrying in ${delay}s...`, DatadogLogLevel.Warn);
          return timer(delay);
        },
      }),
    );
  }

  #isSoldOutHidden(): boolean {
    return this.#optimizelyService.isFeatureEnabled(FeatureFlags.KIOSK_SCREEN_SAVER) === true;
  }

  /**
   * Mirrors the backend preview rule on the already-filtered groups: with more than
   * one group on the home, each section renders a preview capped at 3 plans, and
   * "See all" reflects whether more *available* plans were fetched. With one group
   * or none the home flattens the plans into a single list, so nothing is capped.
   */
  // blind past the 10 fetched plans per section. A category whose first 10
  // plans hold fewer than 3 available under-fills its row, and availables beyond the
  // 10th cannot turn "See all" back on. Filtering server-side removes the ceiling.
  #previewOfAvailableGroups(groups: KioskCategoryGroup[]): KioskCategoryGroup[] {
    if (groups.length <= 1) {
      return groups;
    }
    return groups.map(group => ({
      category: { ...group.category, has_more_plans: group.plans.length > KioskService.plansPerSectionPreview },
      plans: group.plans.slice(0, KioskService.plansPerSectionPreview),
    }));
  }

  #withoutSoldOutPlans(result: KioskPlansResult): KioskPlansResult {
    if (!this.#isSoldOutHidden()) {
      return result;
    }
    if (result.kind === 'groups') {
      return { kind: 'groups', payload: this.#previewOfAvailableGroups(this.excludeSoldOutGroups(result.payload)) };
    }
    return { kind: 'plans', payload: result.payload.filter(plan => plan.is_purchasable !== false) };
  }
}
