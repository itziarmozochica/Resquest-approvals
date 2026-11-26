import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';

import { isUiTest } from '@fz-original/app/app/utils/ui-test/ui-test.util';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { environment } from '@fz-original/environments/environment';
import { Client, createInstance, enums, logging, OptimizelyDecision, UserAttributes } from '@optimizely/optimizely-sdk';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import { timeout } from 'rxjs/operators';

import { OrganizationTypeEnum } from '../models/partner/organization-type.enum';
import { OptimizelyFeatureKeyDef } from './optimizely-feature-key';
import { OptimizelyLogHandler } from './optimizely-log-handler';

export const OPTIMIZELY_SDK_KEY = new InjectionToken<string>('OPTIMIZELY_SDK_KEY');

const isDatafileWithFeatureFlags = (datafile: unknown): datafile is { featureFlags: { key: string }[] } =>
  typeof datafile === 'object' &&
  datafile !== null &&
  'featureFlags' in datafile &&
  Array.isArray(datafile.featureFlags) &&
  datafile.featureFlags.every(flag => typeof flag === 'object' && flag !== null && 'key' in flag && typeof flag.key === 'string');

@Injectable({ providedIn: 'root' })
export class OptimizelyService {
  #country = '';
  readonly #datadogLog = inject(DatadogLogService);
  #deviceId = '';
  #document = inject(DOCUMENT);
  #featureKeys: Set<string> | null = null;
  #fixedFeatures: Record<string, boolean> | null = null;
  #http = inject(HttpClient);
  #initialized = false;
  #isSuperuser = false;
  #isSuperUser$ = new ReplaySubject<boolean>(1);
  #organizationType: OrganizationTypeEnum | null = null;
  #partnerCountry = '';
  #partnerId = '';
  #planId = '';
  #sdk: Client | null = null;
  #sdkKey = inject(OPTIMIZELY_SDK_KEY);
  #userEmailDomain = '';
  #userId = '';
  setPlanData = new BehaviorSubject<void>(undefined);
  setUserData = new BehaviorSubject<void>(undefined);

  clearCountry(): void {
    this.#country = '';
  }

  clearPartnerCountry(): void {
    this.#partnerCountry = '';
  }

  decide(featureKey: string, attributes?: UserAttributes): OptimizelyDecision | null {
    if (!this.#initialized || !this.#userId || !this.#sdk) {
      return null;
    }

    if (this.#isSuperuser) {
      const superuserDecision = this.#decideAs(featureKey, Object.assign({}, { is_superuser: true }, attributes));
      if (superuserDecision?.enabled) {
        return superuserDecision;
      }
    }

    return this.#decideAs(featureKey, attributes);
  }

  getFeatureUrlOverride(featureKey: string): boolean | null {
    const urlOverride = this.#getFixedFeatures()[featureKey.toLowerCase()];

    return typeof urlOverride === 'boolean' ? urlOverride : null;
  }

  getFeatureVariableJSON<T = unknown>(featureKey: string, variableKey: string, attributes?: UserAttributes): T | null {
    if (!this.#initialized || !this.#userId || !this.#sdk) {
      return null;
    }
    return this.#sdk.getFeatureVariableJSON(featureKey, variableKey, this.#userId, this.#buildUserAttributes(attributes)) as T | null;
  }

  getIsSuperUser(): Observable<boolean> {
    return this.#isSuperUser$.asObservable();
  }

  getOrganizationType(): OrganizationTypeEnum | null {
    return this.#organizationType;
  }

  getPartnerCountry(): string {
    return this.#partnerCountry;
  }

  getPartnerId(): string {
    return this.#partnerId;
  }

  getPlanId(): string {
    return this.#planId;
  }

  getUserId(): string {
    return this.#userId;
  }

  initialize(): Promise<void> {
    if (this.#initialized) {
      return Promise.resolve();
    }
    const url = isUiTest() ? `${environment.baseUrl}/fake-cdn.optimizely` : `https://cdn.optimizely.com/datafiles/${this.#sdkKey}.json`;
    this.#initialized = true;

    return new Promise(resolve => {
      this.#http
        .get<string | object>(url)
        .pipe(timeout(6000))
        .subscribe({
          error: () => {
            this.#initialized = false;
            resolve();
          },
          next: (datafile: string | object) => {
            this.#featureKeys = this.#readFeatureKeys(datafile);
            this.#sdk = createInstance({
              datafile,
              logger: new OptimizelyLogHandler(this.#datadogLog, environment.production ? null : logging.createLogger()),
              logLevel: environment.production ? enums.LOG_LEVEL.ERROR : enums.LOG_LEVEL.INFO,
            });
            resolve();
          },
        });
    });
  }
  /**
   * @deprecated
   * Use the OptimizelyFeatureKeyDef overload instead of a key string for team tracking:
   * ```typescript
   * export type OptimizelyFeatureKeyDef = {
   *   optimizelyFeatureKey: string;
   *   team: FeverTeam;
   * }
   * ```
   */
  isFeatureEnabled(featureKey: string, attributes?: UserAttributes): boolean | null;
  isFeatureEnabled(optimizelyFeatureKey: OptimizelyFeatureKeyDef, attributes?: UserAttributes): boolean | null;
  isFeatureEnabled(featureKeyOrDef: string | OptimizelyFeatureKeyDef, attributes?: UserAttributes): boolean | null {
    const featureKey = typeof featureKeyOrDef === 'string' ? featureKeyOrDef : featureKeyOrDef.optimizelyFeatureKey;

    const urlOverride = this.#getFixedFeatures()[featureKey.toLowerCase()];
    if (typeof urlOverride === 'boolean') {
      return urlOverride;
    }

    if (!this.#initialized || !this.#userId || !this.#sdk) {
      return null;
    }

    if (this.#isSuperuser && (!this.#featureKeys || this.#featureKeys.has(featureKey))) {
      const superuserAttributes = Object.assign({}, { is_superuser: true }, attributes);
      const isSuperuserFFEnabled = this.#sdk.isFeatureEnabled(featureKey, this.#userId, this.#buildUserAttributes(superuserAttributes));
      if (isSuperuserFFEnabled) {
        return isSuperuserFFEnabled;
      }
    }

    return this.#sdk.isFeatureEnabled(featureKey, this.#userId, this.#buildUserAttributes(attributes));
  }

  observePlanData(): Observable<void> {
    return this.setPlanData.asObservable();
  }

  observeUserData(): Observable<void> {
    return this.setUserData.asObservable();
  }

  setCountry(country: string): void {
    this.#country = country;
  }

  setDeviceId(deviceId: string): void {
    this.#deviceId = deviceId;
  }

  setIsSuperuser(isSuperuser: boolean): void {
    this.#isSuperUser$.next(isSuperuser);
    this.#isSuperuser = isSuperuser;
  }

  setOrganizationType(organizationType: OrganizationTypeEnum): void {
    this.#organizationType = organizationType;
  }

  setPartnerCountry(country: string): void {
    this.#partnerCountry = country;
  }

  setPartnerId(partnerId: string): void {
    this.#partnerId = partnerId;
  }

  setPlanId(planId: string): void {
    this.#planId = planId;
  }

  setUserEmail(email: string | null | undefined): void {
    if (!email) {
      this.#userEmailDomain = '';
      return;
    }

    const atIndex = email.lastIndexOf('@');
    this.#userEmailDomain = atIndex > -1 ? email.slice(atIndex + 1).toLowerCase() : '';
  }

  setUserId(userId: string): void {
    this.#userId = userId;
  }

  #buildUserAttributes(attrs?: UserAttributes): UserAttributes {
    const attributes_optimizely: Record<string, string | number | boolean | null> = {
      user_id: this.#userId,
    };
    if (this.#partnerId) {
      attributes_optimizely['partner_id'] = this.#partnerId;
    }

    if (this.#organizationType) {
      attributes_optimizely['organization_type'] = this.#organizationType;
    }

    if (this.#planId) {
      attributes_optimizely['plan_id'] = this.#planId;
    }

    if (this.#country) {
      attributes_optimizely['country'] = this.#country;
    }

    if (this.#partnerCountry) {
      attributes_optimizely['partner_country'] = this.#partnerCountry;
    }

    if (this.#deviceId) {
      attributes_optimizely['device_id'] = this.#deviceId;
    }

    if (this.#userEmailDomain) {
      attributes_optimizely['user_email_domain'] = this.#userEmailDomain;
    }

    return Object.assign({}, attributes_optimizely, attrs);
  }

  #decideAs(featureKey: string, attributes?: UserAttributes): OptimizelyDecision | null {
    return this.#sdk?.createUserContext(this.#userId, this.#buildUserAttributes(attributes))?.decide(featureKey) ?? null;
  }

  /**
   * Parses URL query parameter `ofeat` for feature flag overrides.
   * Cached after first parse. Only works in browser environment.
   * Matching is case-insensitive: keys are stored and looked up in lowercase.
   *
   * Usage examples:
   * - `?ofeat=flag_name` - enables flag (default true)
   * - `?ofeat=FLAG_NAME` - same as above (case-insensitive)
   * - `?ofeat=flag_name=false` - explicitly disables flag
   * - `?ofeat=flag1;flag2;flag3=false` - multiple flags separated by semicolons
   */
  #getFixedFeatures(): Record<string, boolean> {
    if (this.#fixedFeatures !== null) {
      return this.#fixedFeatures;
    }

    this.#fixedFeatures = {};

    const windowRef = this.#document.defaultView;
    if (!windowRef) {
      return this.#fixedFeatures;
    }

    const featuresParam = new URLSearchParams(windowRef.location.search).get('ofeat');
    if (!featuresParam) {
      return this.#fixedFeatures;
    }

    const features = featuresParam.split(';');
    features.forEach(feature => {
      const [featureName, enabledStr] = feature.split('=');
      if (featureName) {
        this.#fixedFeatures![featureName.toLowerCase()] = enabledStr !== 'false';
      }
    });

    return this.#fixedFeatures;
  }

  #readFeatureKeys(datafile: string | object): Set<string> | null {
    try {
      const parsed: unknown = typeof datafile === 'string' ? JSON.parse(datafile) : datafile;
      return isDatafileWithFeatureFlags(parsed) ? new Set(parsed.featureFlags.map(flag => flag.key)) : null;
    } catch {
      return null;
    }
  }
}
