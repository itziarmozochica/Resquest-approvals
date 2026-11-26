import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, effect, inject, Injector, Signal, ViewContainerRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

import { KioskStateService } from '@fz-original/app/modules/kiosk/services/kiosk-state/kiosk-state.service';
import { PartnerSelectedMessage } from '@fz-original/app/shared/services/webview-messenger/models/partner-selected-message';
import { TranslateService } from '@ngx-translate/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { merge } from 'rxjs';

import { environment } from '../environments/environment';
import { BreakpointStateService } from './app/services/breakpoint/breakpoint-state.service';
import { AuthenticationService } from './core/authentication/authentication.service';
import { SentryBrowser } from './core/error/sentry/sentry-browser';
import { LoginSuccessfulEvent } from './core/tracking/core/events/login-successful';
import { ExtendedMixpanelTrackingProvider } from './core/tracking/mixpanel/mixpanel-tracking.provider';
import { MixpanelIdentifyData } from './core/tracking/providers/mixpanel/mixpanel-identify-data';
import { TrackingService } from './core/tracking/tracking.service';
import { OboSecondScreenDataService } from './modules/box-office/obo-second-screen/services/obo-second-screen-data.service';
import { SpinnerService } from './shared/layout/spinner/spinner.service';
import { OrganizationTypeEnum } from './shared/models/partner/organization-type.enum';
import { Partner } from './shared/models/partner/partner.model';
import { FeatureFlags } from './shared/optimizely/feature-flags';
import { OptimizelyService } from './shared/optimizely/optimizely.service';
import { DirectionService } from './shared/services/direction/direction.service';
import { BusinessAsOrganizationSessionService } from './shared/services/distributor/business-as-organization-session.service';
import { DistributorSessionStore } from './shared/services/distributor/distributor-session.store';
import { DualScreenStorageService } from './shared/services/dual-screen/dual-screen-storage.service';
import { MainScreenActivityBroadcastService } from './shared/services/dual-screen/main-screen-activity-broadcast.service';
import { DynamicRoutingService } from './shared/services/dynamic-routing/dynamic-routing.service';
import { PartnerConfigService } from './shared/services/partner-config/partner-config.service';
import { PartnerThemeLoaderService } from './shared/services/partner-theme-loader/partner-theme-loader.service';
import { PartnerService } from './shared/services/partner/partner.service';
import { SurvicateService } from './shared/services/script-loader/survicate/survicate.service';
import { ZendeskService } from './shared/services/script-loader/zendesk/zendesk.service';
import { UserService } from './shared/services/user/user.service';
import { VersionCheckService } from './shared/services/version-checker/version-checker.service';
import { WebviewMessengerService } from './shared/services/webview-messenger/webview-messenger.service';

@Component({
  selector: 'app-root',
  standalone: false,
  styleUrls: ['./app.component.scss'],
  templateUrl: './app.component.html',
})
export class AppComponent implements AfterViewInit {
  readonly #document = inject(DOCUMENT);
  readonly #breakpointStateService = inject(BreakpointStateService);
  readonly #businessAsOrganizationSession = inject(BusinessAsOrganizationSessionService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #directionService = inject(DirectionService);
  readonly #dualScreenStorageService = inject(DualScreenStorageService);
  readonly #injector = inject(Injector);
  readonly #kioskStateService = inject(KioskStateService);
  readonly #mainScreenActivityBroadcast = inject(MainScreenActivityBroadcastService);
  readonly #partnerThemeLoaderService = inject(PartnerThemeLoaderService);
  readonly #distributorSession = inject(DistributorSessionStore);
  readonly #router = inject(Router);
  private readonly device: string;
  private readonly deviceType: string;
  isGlobalSpinnerLoading$ = this.spinnerService.isLoading$;
  isKiosk: Signal<boolean> = this.#kioskStateService.getStateProp('isKioskRoute');

  constructor(
    private trackingService: TrackingService,
    private mixpanelTrackingProvider: ExtendedMixpanelTrackingProvider,
    private authenticationService: AuthenticationService,
    private partnerService: PartnerService,
    private survicateService: SurvicateService,
    private zendeskService: ZendeskService,
    private deviceDetector: DeviceDetectorService,
    private optimizelyService: OptimizelyService,
    private versionChecker: VersionCheckService,
    private userService: UserService,
    private spinnerService: SpinnerService,
    private dynamicRouting: DynamicRoutingService,
    private webviewMessenger: WebviewMessengerService,
    private readonly partnerConfigService: PartnerConfigService,
    public viewContainerRef: ViewContainerRef,
    private oboSecondScreenDataService: OboSecondScreenDataService,
    private titleService: Title,
    private translate: TranslateService,
  ) {
    const deviceInfo = this.deviceDetector.getDeviceInfo();
    this.device = deviceInfo.device;
    this.deviceType = deviceInfo.deviceType;
    this.#router.events.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(event => {
      if (event instanceof NavigationStart) {
        if ((event as NavigationStart).url.startsWith('/kiosk')) {
          this.#kioskStateService.updateStateProp('isKioskRoute', true);
          this.#partnerThemeLoaderService.disableDynamicBrand();
        }
        if ((event as NavigationStart).id === 1) {
          this.spinnerService.show();
        }
      }
      if (event instanceof NavigationEnd) {
        window.gtag?.('config', environment.gtaId, { page_path: event.urlAfterRedirects });
        if (this.#isZendeskWidgetEnabled()) {
          this.zendeskService.updateCurrentUrl(event.urlAfterRedirects);
        }
        setTimeout(() => this.#setDocumentTitle(), 0);
        /**
         * This should not be placed here.
         * We would not hide the spinner just because the navigation ended.
         */
        if (
          !this.isKiosk() &&
          !event.url.includes('/login?code=') &&
          !event.url.includes('/login/onebox') &&
          !event.url.includes('/login/backoffice') &&
          !event.url.includes('/box-office/odoo-food-and-beverage') &&
          !this.#currentRouteHidesSpinnerItself()
        ) {
          setTimeout(() => this.spinnerService.hide(), 0);
        }
      }
    });
    merge(this.translate.onLangChange, this.translate.onTranslationChange)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        setTimeout(() => this.#setDocumentTitle(), 0);
      });
    this.authenticationService
      .observeUser()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(userId => {
        this.trackingService.enable(true);
        if (userId) {
          this.optimizelyService.setUserId(userId.toString());
        }
      });
    this.partnerService
      .observePartner()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(partner => {
        const userId = this.authenticationService.getUserId();
        if (userId && partner) {
          SentryBrowser.addUserContext(userId);
          SentryBrowser.addPartnerContext(partner.id);
          this.#sendPartnerSelectedMessage(partner);
          this.partnerConfigService.config = partner;
          this.#setOptimizelyAttributes(userId, partner);
          if (this.#businessAsOrganizationSession.reconcile(partner.id)) {
            return;
          }
          this.dynamicRouting.updateRouting();
          this.userService.setUserId(userId);
          this.userService.setPartnerId(partner.id);
          this.userService
            .getMe()
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(
              response => {
                if (response?.data) {
                  const retrievedUser = response.data;
                  const emailStaff: string = retrievedUser.isStaff() ? retrievedUser.email : null;
                  const mxpIdentifyData = new MixpanelIdentifyData(
                    partner.id,
                    partner.countryCode,
                    partner.name,
                    retrievedUser.id,
                    retrievedUser.name,
                    retrievedUser.email,
                    this.device,
                    this.deviceType,
                    emailStaff,
                    this.userService.isBusiness() ? OrganizationTypeEnum.RESELLER : partner.type,
                  );
                  this.optimizelyService.setIsSuperuser(retrievedUser.isStaff());
                  this.optimizelyService.setUserEmail(retrievedUser.email);
                  this.authenticationService.setUserName(retrievedUser.name || retrievedUser.email);
                  this.mixpanelTrackingProvider.identify(mxpIdentifyData);
                  this.trackingService.track(new LoginSuccessfulEvent());
                  if (this.#isZendeskWidgetEnabled()) {
                    this.zendeskService.run(retrievedUser, partner);
                  }
                  if (
                    environment.survicate.enable &&
                    !retrievedUser.isStaff() &&
                    !retrievedUser.isKiosk() &&
                    !this.partnerService.isReseller(partner.type) &&
                    !this.userService.isBusiness()
                  ) {
                    this.survicateService.run(retrievedUser.id, partner);
                  }
                  this.optimizelyService.setUserData.next();
                  this.userService
                    .getPermissionsInOrganization()
                    .pipe(takeUntilDestroyed(this.#destroyRef))
                    .subscribe(() => {
                      this.#sendDistributorToItsLandingRoute();
                      this.userService.permissions$.next();
                    });
                  this.userService.setUserEmail(retrievedUser.email);
                } else {
                  this.#abandonSession();
                }
              },
              () => {
                this.#abandonSession();
              },
            );
        }
      });
    this.#breakpointStateService.observeBreakpoint(this.#destroyRef);
    this.#loadPdfLibrary();
    this.#initializeDirectionAttribute();
    this.#mainScreenActivityBroadcast.start();
  }

  ngAfterViewInit(): void {
    this.versionChecker.initVersionCheck();
    this.oboSecondScreenDataService.resetCart();
  }

  #abandonSession(): void {
    this.spinnerService.hide();
    this.authenticationService.logout();
  }

  #currentRouteHidesSpinnerItself(): boolean {
    let route = this.#router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.data['hidesSpinnerItself'] === true;
  }

  #initializeDirectionAttribute(): void {
    effect(() => {
      this.#document.documentElement.setAttribute('dir', this.#directionService.direction());
    });
  }

  #isZendeskWidgetEnabled(): boolean {
    return (
      this.optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.ENABLE_ZENDESK_WIDGET,
        team: 'b2b-inventory',
      }) === true
    );
  }

  // The print stack (ticket PDF generators and their embedded logos) stays out of the startup bundle:
  // only a dual-screen device preloads it here, every other device loads it with its first print.
  #loadPdfLibrary(): void {
    if (!this.#dualScreenStorageService.containsData()) {
      return;
    }
    import('./shared/services/print-facade/print-facade.service').then(
      ({ PrintFacadeService }: typeof import('./shared/services/print-facade/print-facade.service')) => {
        this.#injector.get(PrintFacadeService).dispatchUntracked({ args: [true], method: 'loadPdfLibrary' });
      },
      // A failed chunk only skips this warm-up; the first print loads the chunk again.
      (): void => undefined,
    );
  }

  /**
   * Sidebar labels can still be raw i18n keys (e.g. menu.reservations) when this runs before
   * ngx-translate updates the DOM; resolve known key shapes for the browser tab title.
   */
  #looksLikeTranslationKeyForTitle(label: string): boolean {
    return /^[a-z][a-z0-9]*\.[\w.]+$/.test(label);
  }

  #resolveSidebarLabelForDocumentTitle(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) {
      return '';
    }
    if (this.#looksLikeTranslationKeyForTitle(trimmed)) {
      return this.translate.instant(trimmed);
    }
    return trimmed;
  }

  /**
   * The landing route is chosen by `PermissionBasedGuard` the moment navigation starts, and for a
   * distributor that is too early: `user$` replays the previous organization's user straight away, so
   * the guard runs while this `getMe()` is still in flight and neither the session store nor
   * Optimizely can answer yet. It picks `/home`, which the distributor menu no longer has.
   *
   * So this runs once `getPermissionsInOrganization()` has answered, not straight off `getMe()`:
   * the rules are read from `permissionsInOrganization`, and an organization switch empties that
   * array before the new one's permissions arrive. Resolving against an empty set matches no rule
   * and returns the `/validation` default, which is not where the role belongs.
   *
   * Only from `/home`, so a deep link or a reload on any other screen is left alone.
   */
  #sendDistributorToItsLandingRoute(): void {
    if (!this.#distributorSession.isDistributorSession()) {
      return;
    }

    if (this.#router.url.split('?')[0] !== '/home') {
      return;
    }

    const permissions = this.userService.permissionsInOrganization;
    if (permissions.length === 0) {
      return;
    }

    this.userService.setFirstActiveUrlByPermission(permissions);
    void this.#router.navigate([this.userService.getFirstActiveUrlByPermission()], { replaceUrl: true });
  }

  #sendPartnerSelectedMessage(partner: Partner): void {
    const message = new PartnerSelectedMessage({ partnerId: partner.id, partnerName: partner.name });
    this.webviewMessenger.sendWebViewMessage(message);
  }

  #setDocumentTitle(): void {
    try {
      const activeLabels: string[] = [];
      const activeNestedEl = this.#document.querySelector('.sidebar__section [class*="menu-item--is-active"] .menu-item__label');
      if (activeNestedEl?.textContent) {
        const nested = this.#resolveSidebarLabelForDocumentTitle(activeNestedEl.textContent);
        if (nested.length > 0) {
          activeLabels.push(nested);
        }
      }
      const activeTopEl = this.#document.querySelector('.menu-item.menu-item--is-active .menu-item__label');
      if (activeTopEl?.textContent) {
        const top = this.#resolveSidebarLabelForDocumentTitle(activeTopEl.textContent);
        if (top.length > 0 && !activeLabels.includes(top)) {
          activeLabels.push(top);
        }
      }

      const finalTitle: string = activeLabels.length > 0 ? activeLabels.join(' - ') : 'FeverZone';
      this.titleService.setTitle(finalTitle);
    } catch {
      this.titleService.setTitle('FeverZone');
    }
  }

  #setOptimizelyAttributes(userId: number, partner: Partner): void {
    this.optimizelyService.setUserId(userId.toString());
    this.optimizelyService.setPartnerId(partner.id.toString());
    this.optimizelyService.setPartnerCountry(partner.countryCode);
    this.optimizelyService.setOrganizationType(partner.type);
  }
}
