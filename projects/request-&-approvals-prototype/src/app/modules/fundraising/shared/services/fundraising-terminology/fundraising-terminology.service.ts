import { HttpClient } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, Injector, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { fundraisingPermissions } from '@fz-original/app/shared/services/user/fundraising-permissions.constants';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { environment } from '@fz-original/environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { catchError, combineLatest, distinctUntilChanged, filter, map, Observable, of, switchMap, tap, throwError } from 'rxjs';

import { FundraisingTerminologyAdapter } from './fundraising-terminology.adapter';
import {
  FundraisingTerminologyPresetsResponseDto,
  FundraisingTerminologySettingsResponseDto,
  UpdateFundraisingTerminologySettingsDto,
} from './fundraising-terminology.dto';
import {
  FundraisingTerminologyPreset,
  FundraisingTerminologySettings,
  FundraisingTerminologyVocabulary,
} from './fundraising-terminology.model';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const VOCABULARY_KEYS = ['patron', 'patrons', 'gift', 'gifts', 'donor', 'donors'] as const;
const PRESET_VOCABULARY_I18N_PREFIX = 'fundraising.settings.terminology.presetTypes';
const TOKEN_PREFIXES = [
  ['patron', 'terminologyPatron'],
  ['patrons', 'terminologyPatronPlural'],
  ['gift', 'terminologyGift'],
  ['gifts', 'terminologyGiftPlural'],
  ['donor', 'terminologyDonor'],
  ['donors', 'terminologyDonorPlural'],
] as const;

@Injectable({
  providedIn: 'root',
})
export class FundraisingTerminology {
  static readonly BASE_I18N_PRESET = 'museum';
  static readonly DEFAULT_PRESET = 'default';

  readonly #adapter = inject(FundraisingTerminologyAdapter);
  readonly #destroyRef = inject(DestroyRef);
  readonly #http = inject(HttpClient);
  readonly #injector = inject(Injector);
  readonly #optimizely = inject(OptimizelyService);
  readonly #partner = inject(PartnerService);
  readonly #user = inject(UserService);

  readonly #cacheExpirySeconds = 5 * 60;
  #initialized = false;
  #presetsCache = new Map<number, CacheEntry<BaseResponse<FundraisingTerminologyPreset[]>>>();
  #settingsCache = new Map<number, CacheEntry<FundraisingTerminologySettings | null>>();

  readonly #preset = signal<string | null>(null);
  readonly #vocabulary = signal<FundraisingTerminologyVocabulary>({});
  readonly preset: Signal<string | null> = this.#preset.asReadonly();
  readonly tokens: Signal<Record<string, string>> = computed(() => this.#toTokens(this.#vocabulary()));

  getPresets(partnerId?: number): Observable<BaseResponse<FundraisingTerminologyPreset[]>> {
    const resolvedPartnerId = this.#resolvePartnerId(partnerId);
    if (resolvedPartnerId === undefined) {
      return of(this.#adapter.fromApi(new BaseResponse([], null)));
    }

    const cached = this.#presetsCache.get(resolvedPartnerId);
    if (cached && Date.now() < cached.expiresAt) {
      return of(cached.data);
    }

    const url = `${this.#getBaseUrl(resolvedPartnerId)}/terminology-presets`;
    return this.#http.get<FundraisingTerminologyPresetsResponseDto>(url).pipe(
      map(response => {
        const presetDtos = response?.presets ?? [];
        return this.#adapter.fromApi(new BaseResponse(presetDtos, null));
      }),
      tap(data => this.#cachePresets(resolvedPartnerId, data)),
    );
  }

  getSettings(partnerId?: number): Observable<FundraisingTerminologySettings | null> {
    const resolvedPartnerId = this.#resolvePartnerId(partnerId);
    if (resolvedPartnerId === undefined) {
      return of(null);
    }

    const cached = this.#settingsCache.get(resolvedPartnerId);
    if (cached && Date.now() < cached.expiresAt) {
      return of(cached.data);
    }

    return this.#http
      .get<FundraisingTerminologySettingsResponseDto | null>(`${this.#getBaseUrl(resolvedPartnerId)}/terminology-settings`)
      .pipe(
        map(response => (response ? this.#adapter.settingsFromApi(response) : null)),
        tap(settings => this.#cacheSettings(resolvedPartnerId, settings)),
        catchError(error => {
          if (error?.status === 404) {
            this.#cacheSettings(resolvedPartnerId, null);
            return of(null);
          }

          return throwError(() => error);
        }),
      );
  }

  initialize(): void {
    if (this.#initialized) {
      return;
    }
    this.#initialized = true;

    const partner$ = this.#partner.observePartner().pipe(
      filter((partner): partner is Partner => partner !== null),
      distinctUntilChanged((previous, next) => previous.id === next.id),
      tap(() => {
        this.invalidateCache();
        this.#preset.set(null);
        this.#vocabulary.set({});
      }),
    );

    combineLatest([partner$, this.#optimizely.observeUserData(), this.#user.permissions$])
      .pipe(
        switchMap(([partner]) => {
          if (partner.terminology) {
            this.#applySettings({ preset: partner.terminology.preset || FundraisingTerminology.DEFAULT_PRESET, vocabulary: {} });
            return of(undefined);
          }
          if (!this.#shouldLoadSettings()) {
            return of(undefined);
          }
          return this.#syncSettingsFromBackend(partner.id);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  invalidateCache(): void {
    this.#presetsCache.clear();
    this.#settingsCache.clear();
  }

  resolve(key: string, params?: Record<string, unknown>): string {
    const translate = this.#getTranslate();
    const preset = this.#preset();
    if (preset === FundraisingTerminology.BASE_I18N_PRESET) {
      return translate.instant(key, params);
    }
    const withTokens = this.#withTokens(params);
    const terminologyKey = `${key}Terminology`;
    const probed = translate.instant(terminologyKey);
    if (typeof probed === 'string' && probed !== terminologyKey) {
      return translate.parser.interpolate(probed, withTokens) ?? probed;
    }
    if (probed && typeof probed === 'object' && !Array.isArray(probed) && preset) {
      const candidate = (probed as Record<string, unknown>)[preset];
      if (typeof candidate === 'string') {
        return translate.parser.interpolate(candidate, withTokens) ?? candidate;
      }
    }
    return translate.instant(key, params);
  }

  setPreset(next: string): Observable<void> {
    if (this.#preset() === next) {
      return of(undefined);
    }

    const previousPreset = this.#preset();
    const previousVocabulary = this.#vocabulary();
    const lookedUp = this.#lookupVocabularyFromPresets(next);
    this.#preset.set(next);
    if (lookedUp) {
      this.#vocabulary.set(this.#withFallback(lookedUp));
    }
    this.#republishTranslations();

    return this.updateSettings(next).pipe(
      tap(() => {
        if (lookedUp) {
          return;
        }
        this.#settingsCache.clear();
        this.getSettings()
          .pipe(takeUntilDestroyed(this.#destroyRef))
          .subscribe({
            error: () => {},
            next: settings => {
              if (settings) {
                this.#vocabulary.set(this.#withFallback(settings.vocabulary));
                this.#republishTranslations();
              }
            },
          });
      }),
      catchError(error => {
        this.#preset.set(previousPreset);
        this.#vocabulary.set(previousVocabulary);
        this.#republishTranslations();
        return throwError(() => error);
      }),
    );
  }

  updateSettings(presetKey: string): Observable<void> {
    const body: UpdateFundraisingTerminologySettingsDto = { preset: presetKey };
    return this.#http.put<void>(`${this.#getBaseUrl()}/terminology-settings`, body).pipe(tap(() => this.#settingsCache.clear()));
  }

  #applySettings(settings: FundraisingTerminologySettings | null): void {
    if (settings) {
      this.#preset.set(settings.preset);
      this.#vocabulary.set(this.#withFallback(settings.vocabulary));
    } else {
      this.#preset.set(null);
      this.#vocabulary.set({});
    }
    this.#republishTranslations();
  }

  #cachePresets(partnerId: number, data: BaseResponse<FundraisingTerminologyPreset[]>): void {
    this.#presetsCache.set(partnerId, { data, expiresAt: Date.now() + this.#cacheExpirySeconds * 1000 });
  }

  #cacheSettings(partnerId: number, data: FundraisingTerminologySettings | null): void {
    this.#settingsCache.set(partnerId, { data, expiresAt: Date.now() + this.#cacheExpirySeconds * 1000 });
  }

  #getBaseUrl(partnerId = this.#partner.getPartner()?.id): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}`;
  }

  #getFallbackVocabulary(presetKey: string | null = this.#preset()): FundraisingTerminologyVocabulary {
    const resolvedPreset = presetKey ?? FundraisingTerminology.DEFAULT_PRESET;
    return this.#loadVocabularyFromI18n(resolvedPreset);
  }

  #getRawI18nString(key: string): string | undefined {
    const translate = this.#getTranslate();
    const lang = translate.currentLang ?? translate.defaultLang;
    if (!lang) {
      return undefined;
    }

    const dict = translate.translations?.[lang];
    if (!dict) {
      return undefined;
    }

    const value = key.split('.').reduce<unknown>((acc, segment) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[segment];
      }
      return undefined;
    }, dict);

    return typeof value === 'string' ? value : undefined;
  }

  #getTranslate(): TranslateService {
    return this.#injector.get(TranslateService);
  }

  #loadVocabularyFromI18n(presetKey: string): FundraisingTerminologyVocabulary {
    const vocabulary: FundraisingTerminologyVocabulary = {};
    for (const key of VOCABULARY_KEYS) {
      const i18nKey = `${PRESET_VOCABULARY_I18N_PREFIX}.${presetKey}.vocabulary.${key}`;
      const value = this.#getRawI18nString(i18nKey);
      if (value) {
        vocabulary[key] = value;
      }
    }
    return vocabulary;
  }

  #lookupVocabularyFromPresets(presetKey: string): FundraisingTerminologyVocabulary | null {
    const partnerId = this.#partner.getPartner()?.id;
    const cached = partnerId !== undefined ? this.#presetsCache.get(partnerId) : undefined;
    const match = cached?.data.data?.find(preset => preset.key === presetKey);
    return match?.vocabulary ?? null;
  }

  #republishTranslations(): void {
    const translate = this.#getTranslate();
    const lang = translate.currentLang ?? translate.defaultLang;
    if (!lang) {
      return;
    }

    const translations = translate.translations?.[lang];
    if (!translations) {
      return;
    }

    translate.setTranslation(lang, translations, true);
  }

  #resolvePartnerId(partnerId?: number): number | undefined {
    if (!this.#shouldLoadSettings()) {
      return undefined;
    }
    return partnerId ?? this.#partner.getPartner()?.id;
  }

  #shouldLoadSettings(): boolean {
    return fundraisingPermissions.terminology.some(permission => this.#user.hasPermission(permission));
  }

  #syncSettingsFromBackend(partnerId: number): Observable<void> {
    return this.getSettings(partnerId).pipe(
      tap(settings => this.#applySettings(settings)),
      map((): undefined => undefined),
      catchError(() => of(undefined)),
    );
  }

  #toTokens(vocabulary: FundraisingTerminologyVocabulary): Record<string, string> {
    const defaults = this.#getFallbackVocabulary();
    const pick = (key: (typeof VOCABULARY_KEYS)[number]): string => vocabulary[key] || defaults[key] || '';
    return Object.fromEntries(
      TOKEN_PREFIXES.flatMap(([vocabKey, tokenKey]) => {
        const value = pick(vocabKey);
        return [
          [tokenKey, value],
          [`${tokenKey}Lower`, value.toLowerCase()],
        ];
      }),
    );
  }

  #withFallback(vocabulary: FundraisingTerminologyVocabulary): FundraisingTerminologyVocabulary {
    return { ...this.#getFallbackVocabulary(), ...vocabulary };
  }

  #withTokens(params?: Record<string, unknown>): Record<string, unknown> {
    return { ...this.tokens(), ...params };
  }
}
