import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { EMPTY, Observable, of } from 'rxjs';
import { catchError, map, scan } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../models/base-response';
import { Partner } from '../../../models/partner/partner.model';
import { User } from '../../../models/user/user.model';
import { FeatureFlags } from '../../../optimizely/feature-flags';
import { OptimizelyService } from '../../../optimizely/optimizely.service';
import { NavigationService } from '../../navigation/navigation.service';
import { Script } from '../script.model';
import { ScriptService } from '../script.service';

interface ZendeskWidgetContext {
  currentUrl: string;
  partnerId: number;
  partnerName: string;
  userEmail: string;
}

interface ZendeskLoginToken {
  token: string;
}

interface ZendeskWidgetSettings {
  webWidget: {
    chat: {
      connectOnPageLoad: boolean;
      suppress: boolean;
      tags?: string[];
    };
    contactForm: {
      suppress: boolean;
    };
  };
}

type ZendeskWidgetApi = NonNullable<Window['zE']>;

const ZENDESK_SCRIPT_ID = 'ze-snippet';
const ZENDESK_SCRIPT_SRC = `https://static.zdassets.com/ekr/snippet.js?key=${environment.zendesk.widgetKey}`;

const ZENDESK_FIELD_ID_PARTNER_NAME = environment.zendesk.fieldIds.partnerName;
const ZENDESK_FIELD_ID_USER_EMAIL = environment.zendesk.fieldIds.userEmail;
const ZENDESK_FIELD_ID_CURRENT_URL = environment.zendesk.fieldIds.currentUrl;
const ZENDESK_HIDDEN_PATH_PREFIXES: readonly string[] = ['/analytics'];

@Injectable({
  providedIn: 'root',
})
export class ZendeskService {
  readonly #document = inject(DOCUMENT);
  readonly #http = inject(HttpClient);
  readonly #navigationService = inject(NavigationService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #scriptService = inject(ScriptService);
  #authenticatedPartnerId: number | null = null;
  #authenticatedUserEmail = '';
  #isAuthenticationRequested = false;
  #pendingAuthPartnerId: number | null = null;
  #widgetContext: ZendeskWidgetContext | null = null;
  #isCloseHandlerRegistered = false;
  #pendingOpenMessenger = false;
  #isScriptRequested = false;

  readonly #isAvailableOnCurrentRoute: WritableSignal<boolean> = signal(this.#isRouteAvailable(this.#navigationService.getCurrentUrl()));
  readonly isAvailableOnCurrentRoute: Signal<boolean> = this.#isAvailableOnCurrentRoute.asReadonly();

  /**
   * `OptimizelyService.isFeatureEnabled()` is not a signal, and answers `null` until the user is
   * known. Reading this in every gate makes them re-evaluate once the user data lands, instead of
   * keeping the `false` they computed before login. The stream emits `undefined` every time, which a
   * signal would swallow as unchanged, so each emission is counted instead.
   */
  readonly #optimizelyUserData: Signal<number> = toSignal(
    this.#optimizelyService.observeUserData().pipe(scan((emissions: number) => emissions + 1, 0)),
    { initialValue: 0 },
  );

  /** Whether Zendesk messaging is switched on for this partner at all. */
  readonly isMessengerEnabled: Signal<boolean> = computed(() => this.#isFlagOn(FeatureFlags.ENABLE_ZENDESK_WIDGET));

  /**
   * Whether customer service is reached from the new entry points (the FZ Assistant suggestion, the
   * profile menu and the landing banner) instead of the header "Chat with us" button. Off, the header
   * button stays and none of the new entry points show.
   */
  readonly areNewEntryPointsEnabled: Signal<boolean> = computed(
    () => this.isMessengerEnabled() && this.#isFlagOn(FeatureFlags.ENABLE_ZENDESK_NEW_ENTRY_POINTS),
  );

  /** Whether the header "Chat with us" button shows: the pre-existing launcher, on the routes it served. */
  readonly isHeaderLauncherVisible: Signal<boolean> = computed(
    () => this.isMessengerEnabled() && !this.areNewEntryPointsEnabled() && this.isAvailableOnCurrentRoute(),
  );

  openMessenger(): void {
    if (this.#widgetContext === null) {
      return;
    }

    this.#pendingOpenMessenger = true;
    this.#flushPendingOpenMessenger();
  }

  run(user: User, partner: Partner): void {
    if (user.isKiosk()) {
      return;
    }

    const context = this.#buildContext(user, partner, this.#navigationService.getCurrentUrl());
    if (context === null) {
      return;
    }

    this.#widgetContext = context;
    this.#syncRouteAvailability(this.#navigationService.getCurrentUrl());
    this.#setBaseSettings();

    if (this.#scriptService.checkIfScriptIsLoaded(ZENDESK_SCRIPT_ID)) {
      this.#syncRuntimeContext();
      return;
    }

    if (this.#isScriptRequested) {
      return;
    }

    this.#isScriptRequested = true;
    this.#scriptService
      .loadScript(new Script(ZENDESK_SCRIPT_ID, 'text/javascript', ZENDESK_SCRIPT_SRC, true))
      .pipe(catchError(() => EMPTY))
      .subscribe(() => {
        this.#syncRuntimeContext();
      });
  }

  updateCurrentUrl(url: string): void {
    this.#syncRouteAvailability(url);

    if (this.#widgetContext === null) {
      return;
    }

    this.#widgetContext = {
      ...this.#widgetContext,
      currentUrl: this.#toUniversalLink(url, this.#widgetContext.partnerId),
    };
    this.#syncRuntimeContext();
  }

  #authenticateUser(zE: ZendeskWidgetApi): void {
    const authContext = this.#widgetContext;
    if (authContext === null) {
      return;
    }

    const sameUserAndPartner =
      this.#authenticatedUserEmail === authContext.userEmail && this.#authenticatedPartnerId === authContext.partnerId;
    const authInFlightForThisPartner = this.#isAuthenticationRequested && this.#pendingAuthPartnerId === authContext.partnerId;

    if (sameUserAndPartner || authInFlightForThisPartner) {
      return;
    }

    if (this.#isAuthenticationRequested) {
      this.#clearAuthPending();
    }

    this.#isAuthenticationRequested = true;
    this.#pendingAuthPartnerId = authContext.partnerId;

    try {
      zE(
        'messenger',
        'loginUser',
        (tokenCallback: (jwt: string) => void) => {
          const partnerIdForRequest = authContext.partnerId;
          this.#requestMessagingJwtToken(partnerIdForRequest).subscribe(token => {
            const contextStillMatches =
              this.#widgetContext?.partnerId === authContext.partnerId && this.#widgetContext?.userEmail === authContext.userEmail;
            if (token !== null && contextStillMatches) {
              tokenCallback(token);
            } else {
              this.#clearAuthPendingIfMatchingAttempt(authContext.partnerId);
            }
          });
        },
        (error: unknown | null) => {
          if (this.#pendingAuthPartnerId !== authContext.partnerId) {
            return;
          }
          this.#clearAuthPending();
          if (error === null) {
            this.#authenticatedUserEmail = authContext.userEmail;
            this.#authenticatedPartnerId = authContext.partnerId;
          }
        },
      );
    } catch {
      this.#clearAuthPendingIfMatchingAttempt(authContext.partnerId);
    }
  }

  #buildContext(user: User, partner: Partner, currentUrl: string): ZendeskWidgetContext | null {
    if (user.email === undefined || user.email.length === 0) {
      return null;
    }

    return {
      currentUrl: this.#toUniversalLink(currentUrl, partner.id),
      partnerId: partner.id,
      partnerName: partner.name,
      userEmail: user.email,
    };
  }

  #clearAuthPending(): void {
    this.#isAuthenticationRequested = false;
    this.#pendingAuthPartnerId = null;
  }

  #clearAuthPendingIfMatchingAttempt(authContextPartnerId: number): void {
    if (this.#pendingAuthPartnerId === authContextPartnerId) {
      this.#clearAuthPending();
    }
  }

  #normalizeTag(tag: string): string {
    const normalized = tag
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    return normalized.length > 0 ? normalized.slice(0, 64) : 'unknown';
  }

  #requestMessagingJwtToken(partnerId: number): Observable<string | null> {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/zendesk-token`;

    return this.#http.get<BaseResponse<ZendeskLoginToken>>(url).pipe(
      map((response: BaseResponse<ZendeskLoginToken>) => response?.data?.token ?? null),
      catchError(() => of(null)),
    );
  }

  #setBaseSettings(): void {
    const windowRef = this.#document.defaultView;
    if (windowRef === null) {
      return;
    }

    const currentSettings = (windowRef.zESettings as Partial<ZendeskWidgetSettings> | undefined)?.webWidget;
    windowRef.zESettings = {
      ...windowRef.zESettings,
      webWidget: {
        ...currentSettings,
        chat: {
          ...currentSettings?.chat,
          connectOnPageLoad: false,
          suppress: false,
        },
        contactForm: {
          ...currentSettings?.contactForm,
          suppress: false,
        },
      },
    };
  }

  #setConversationFields(zE: ZendeskWidgetApi, fields: ZendeskConversationField[]): void {
    try {
      zE('messenger:set', 'conversationFields', fields);
    } catch {
      return;
    }
  }

  #setConversationTags(zE: ZendeskWidgetApi, tags: string[]): void {
    try {
      zE('messenger:set', 'conversationTags', tags);
    } catch {
      return;
    }
  }

  #syncRuntimeContext(): void {
    const zE = this.#document.defaultView?.zE;
    if (zE === undefined || this.#widgetContext === null) {
      return;
    }

    const conversationFields: ZendeskConversationField[] = [
      { id: ZENDESK_FIELD_ID_PARTNER_NAME, value: this.#widgetContext.partnerName },
      { id: ZENDESK_FIELD_ID_USER_EMAIL, value: this.#widgetContext.userEmail },
      { id: ZENDESK_FIELD_ID_CURRENT_URL, value: this.#widgetContext.currentUrl },
    ];
    this.#setConversationFields(zE, conversationFields);

    const chatTags: string[] = [
      `partner_${this.#normalizeTag(this.#widgetContext.partnerName)}`,
      `url_${this.#normalizeTag(this.#widgetContext.currentUrl)}`,
      `user_${this.#normalizeTag(this.#widgetContext.userEmail)}`,
    ];
    this.#setConversationTags(zE, chatTags);
    this.#authenticateUser(zE);
    this.#updateWidgetVisibility(zE);
    this.#flushPendingOpenMessenger();
  }

  #toAbsoluteUrl(url: string): string {
    const windowRef = this.#document.defaultView;
    if (windowRef === null) {
      return url;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    const locationOrigin =
      windowRef.location.origin !== undefined && windowRef.location.origin.length > 0
        ? windowRef.location.origin
        : windowRef.location.protocol !== undefined &&
            windowRef.location.protocol.length > 0 &&
            windowRef.location.host !== undefined &&
            windowRef.location.host.length > 0
          ? `${windowRef.location.protocol}//${windowRef.location.host}`
          : '';

    if (locationOrigin.length === 0) {
      return url;
    }

    return `${locationOrigin}${url}`;
  }

  #toUniversalLink(url: string, partnerId: number): string {
    const absoluteUrl = this.#toAbsoluteUrl(url);
    try {
      const parsed = new URL(absoluteUrl);
      parsed.searchParams.set('forcedPartnerId', partnerId.toString());
      return parsed.toString();
    } catch {
      return absoluteUrl;
    }
  }

  #flushPendingOpenMessenger(): void {
    if (!this.#pendingOpenMessenger || this.#widgetContext === null) {
      return;
    }

    const zE = this.#document.defaultView?.zE;
    if (zE === undefined) {
      return;
    }

    try {
      zE('messenger', 'show');
      zE('messenger', 'open');
      this.#pendingOpenMessenger = false;
    } catch {
      return;
    }
  }

  #hideLauncher(zE: ZendeskWidgetApi): void {
    try {
      zE('messenger', 'hide');
    } catch {
      return;
    }
  }

  #registerCloseHandler(zE: ZendeskWidgetApi): void {
    if (this.#isCloseHandlerRegistered) {
      return;
    }

    try {
      zE('messenger:on', 'close', () => {
        const zEOnClose = this.#document.defaultView?.zE;
        if (zEOnClose === undefined) {
          return;
        }
        this.#hideLauncher(zEOnClose);
      });
      this.#isCloseHandlerRegistered = true;
    } catch {
      return;
    }
  }

  #isFlagOn(optimizelyFeatureKey: FeatureFlags): boolean {
    this.#optimizelyUserData();
    return this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey, team: 'b2b-inventory' }) === true;
  }

  #isRouteAvailable(path: string): boolean {
    return !ZENDESK_HIDDEN_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
  }

  #syncRouteAvailability(path: string): void {
    this.#isAvailableOnCurrentRoute.set(this.#isRouteAvailable(path));
  }

  #updateWidgetVisibility(zE: ZendeskWidgetApi): void {
    this.#registerCloseHandler(zE);
    this.#hideLauncher(zE);
  }
}
