import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectorRef, Component, DestroyRef, inject, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Navigation, Params, Router } from '@angular/router';

import { DualScreenData } from '@fz-original/app/app/models/dual-screen-data.model';
import { isString } from '@fz-original/app/app/utils/ts/ts.util';
import { isSemanticVersionGreaterOrEqual } from '@fz-original/app/app/utils/version.util';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { OboSecondScreenDataService } from '@fz-original/app/modules/box-office/obo-second-screen/services/obo-second-screen-data.service';
import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { PartnerConfig } from '@fz-original/app/shared/models/partner/partner-config.model';
import { ControlPanelAccessContextService } from '@fz-original/app/shared/services/control-panel-access-context/control-panel-access-context.service';
import {
  BusinessAsOrganizationFlagService,
  PILOT_BUSINESS_ORGANIZATIONS_PAGE_SIZE,
} from '@fz-original/app/shared/services/distributor/business-as-organization-flag.service';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { LandingTargetService } from '@fz-original/app/shared/services/landing-target/landing-target.service';
import { PartnerConfigService } from '@fz-original/app/shared/services/partner-config/partner-config.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { hideBusinessPartnerOrganizations } from '@fz-original/app/shared/utils/hide-business-partner-organizations.util';
import { IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, MonoTypeOperatorFunction, Observable, Subscription } from 'rxjs';
import { catchError, finalize, take, tap } from 'rxjs/operators';

import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { isLogoutRouteUrl } from '../../../core/authentication/is-logout-route-url.util';
import { Organization } from '../../../shared/models/organization/organization.model';
import { OrganizationPreferencesService } from '../../../shared/services/organization-preferences/organization-preferences.service';
import { NFCCardRead } from '../../../shared/services/webview-messenger/models/nfc-card-read.model';
import { MessageType, SourceListen, WebviewMessengerService } from '../../../shared/services/webview-messenger/webview-messenger.service';
import { NfcInfoModalData } from './components/nfc-info-modal/nfc-info-modal-data.model';
import { NfcInfoModalComponent } from './components/nfc-info-modal/nfc-info-modal.component';
import { MobilePosNfcCardReadService } from './services/mobile-pos-nfc-card-read.service';

@Component({
  selector: 'app-login',
  standalone: false,
  styleUrls: ['./login.component.scss'],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  static readonly pageSize = 10;
  #authenticationService = inject(AuthenticationService);
  readonly #organizationPreferencesService = inject(OrganizationPreferencesService);
  #changeDetectorRef = inject(ChangeDetectorRef);
  #continuingList = false;
  #destroyRef = inject(DestroyRef);
  #dialog = inject(Dialog);
  readonly #dialogService = inject(IgntDialogService);
  readonly #datadogLogService = inject(DatadogLogService);
  #dualScreenStorageService = inject(DualScreenStorageService);
  #hiddenOrganizations: Organization[] = [];
  #includeBusinessOrganizations = false;
  #initialItemsPerPage = LoginComponent.pageSize;
  #initialPage: number;
  #listRequestId = 0;
  readonly #mobilePosNfcCardReadService = inject(MobilePosNfcCardReadService);
  #nextItemsPerPage: number | null = null;
  #nfcInfoDialogRef: DialogRef<string, NfcInfoModalComponent> | null = null;
  readonly #nfcLoginMobilePosSerial: string | null = this.#getNfcLoginMobilePosSerial();
  #oboSecondScreenDataService = inject(OboSecondScreenDataService);
  readonly #controlPanelAccessContextService = inject(ControlPanelAccessContextService);
  readonly #businessAsOrganizationFlag = inject(BusinessAsOrganizationFlagService);
  #page = 1;
  #pendingOrganizationRole: Subscription | null = null;
  #partnerConfigService = inject(PartnerConfigService);
  readonly #landingTargetService = inject(LandingTargetService);
  #partnerService = inject(PartnerService);
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #spinnerService = inject(SpinnerService);
  #translate = inject(TranslateService);
  #userService = inject(UserService);
  #webviewMessenger = inject(WebviewMessengerService);
  banner: WritableSignal<string | null> = signal<string | null>(null);
  canShowNfcLogin: WritableSignal<boolean> = signal<boolean>(this.#checkCanShowNfcLogin());
  isDualScreen: WritableSignal<boolean> = signal<boolean>(this.#checkIsDualScreenAvailable());
  isLoadingOrganizations = false;
  logo: WritableSignal<string | null> = signal<string | null>(null);
  nextPage: number | null = null;
  nfcCardData: WritableSignal<string | null> = signal<string | null>(null);
  noOrganizationsFound = false;
  organizationsOnlyOnMarketplace = false;
  organizations: Organization[] = [];
  partnerId: number | null = null;
  redirectUrl: string = AuthenticationService.defaultRedirectUrl;
  searchParam = '';
  showBookingAgents = false;
  showDeleted = false;
  showNfcPinPad: WritableSignal<boolean> = signal<boolean>(false);
  success = {
    displayed: false,
    message: '',
  };

  constructor() {
    this.#initialPage = this.#page;
    this.#webviewMessenger.setUpPage(SourceListen.login);
    this.#readConfigPartner();
    this.#subscribeToNFCMessage();
    const navigation: Navigation | null = this.#router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      if (navigation.extras.state.message) {
        this.success = {
          displayed: true,
          message: navigation.extras.state.message,
        };
      }
    }
    this.#route.queryParams.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      error: (error: unknown) => {
        throw new Error(`Error parsing query params: ${JSON.stringify(error)}`);
      },
      next: params => {
        this.#applyQueryParams(params);
      },
    });
    if (this.#authenticationService.getUserId()) {
      this.#applyQueryParams(this.#route.snapshot.queryParams);
      this.#prepareOrganizationSelector();
    }
  }

  loadMore(): void {
    if (this.isLoadingOrganizations) {
      return;
    }
    const total: number = this.organizations.length;
    if (total === 0) {
      return;
    }
    if (this.nextPage) {
      this.#page = this.#page + 1;
      this.loadMoreOrganizations();
    }
  }

  loadMoreOrganizations(): void {
    this.isLoadingOrganizations = true;
    this.#getUserOrganizations();
  }

  logout(): void {
    this.#cancelPendingOrganizationRole();
    this.#listRequestId += 1;
    this.#authenticationService
      .logout()
      .pipe(
        finalize(() => {
          this.#userService.setSelectedOrganizationRole(null);
          this.#includeBusinessOrganizations = false;
          this.showDeleted = false;
          this.organizations = [];
          this.searchParam = '';
          this.#nextItemsPerPage = this.#initialItemsPerPage;
          this.nextPage = this.#initialPage;
        }),
      )
      .subscribe({
        error: () => {},
        next: () => {},
      });
  }

  onLogin(): void {
    this.#includeBusinessOrganizations = false;
    this.showDeleted = false;
    this.#spinnerService.show();
    this.isLoadingOrganizations = true;
    this.#loadOrganizationsWithControlPanelContextPriming();
  }

  onNfcLoginClick(): void {
    this.nfcCardData.set(null);
    this.showNfcPinPad.set(false);
    this.#nfcInfoDialogRef = this.#dialog.open<string, NfcInfoModalData | null, NfcInfoModalComponent>(NfcInfoModalComponent, {
      backdropClass: 'ignt-modal--background-opaque',
      data: this.#nfcLoginMobilePosSerial === null ? null : { mobilePosSerial: this.#nfcLoginMobilePosSerial },
      disableClose: true,
      panelClass: 'ignt-modal--almost-full-page',
    });
    this.#nfcInfoDialogRef.closed.pipe(take(1)).subscribe((nfcUid: string | undefined) => {
      if (nfcUid !== undefined) {
        this.#handleNFCCardRead({ UID: nfcUid });
      }
    });
  }

  onOpenControlPanel(): void {
    void this.#router.navigate(['/control-panel']);
  }

  searchOrganization(searchParam: string) {
    this.#includeBusinessOrganizations = false;
    this.searchParam = searchParam;
    this.organizations = [];
    this.#nextItemsPerPage = this.#initialItemsPerPage;
    this.nextPage = this.#initialPage;
    this.isLoadingOrganizations = true;
    this.#getUserOrganizations();
  }

  selectOrganization(organizationId: number, options?: { syncRoleFromOrganizations?: boolean }): void {
    const syncRoleFromOrganizations = options?.syncRoleFromOrganizations ?? true;
    this.#cancelPendingOrganizationRole();
    this.#listRequestId += 1;
    if (syncRoleFromOrganizations && !this.organizations.some(organization => organization.id === organizationId)) {
      this.#fetchPreselectedOrganizationRole(organizationId, { enterWithoutRole: false });
      return;
    }
    if (syncRoleFromOrganizations && this.organizations.length > 0) {
      this.#userService.setSelectedOrganizationRoleFromOrganizations(this.organizations, organizationId);
    } else {
      this.#userService.saveSelectedOrganization(this.organizations.find(organization => organization.id === organizationId));
    }
    this.#spinnerService.show();
    this.#landingTargetService.prefetch(organizationId);
    this.#partnerService.get(organizationId).subscribe({
      error: () => {
        this.#spinnerService.hide();
        this.#dialogService.openMessageModal(this.#translate.instant('common.errorTitle'), this.#translate.instant('errors.generic'));
        this.#resetOrganizationSelectorParams();
      },
      next: response => {
        if (response && response.data) {
          this.#partnerService.select(response.data, this.#sanitizeRedirectUrl(this.redirectUrl));
          this.#oboSecondScreenDataService.create(response.data.id);
        } else {
          this.#spinnerService.hide();
          this.#datadogLogService.logWarn('Login: selectOrganization failed', {
            errorJson: this.#safeStringify(response.error),
            source: 'login.selectOrganization',
          });
          this.#dialogService.openMessageModal(
            this.#translate.instant('common.errorTitle'),
            this.#translate.instant(response.error.message),
          );
        }
        this.#resetOrganizationSelectorParams();
      },
    });
  }

  selectOrganizationFromComponent(organizationId: number): void {
    this.selectOrganization(organizationId);
  }

  showDeletedOrganizations(showDeleted: boolean): void {
    this.#includeBusinessOrganizations = false;
    this.showDeleted = showDeleted;
    this.organizations = [];
    this.#nextItemsPerPage = this.#initialItemsPerPage;
    this.nextPage = this.#initialPage;
    this.isLoadingOrganizations = true;
    this.#getUserOrganizations();
  }

  showOrganizationSelector(): boolean {
    return this.#authenticationService.isLoggedIn() && !this.#hasPreselectedOrganization();
  }

  #applyQueryParams(params: Params): void {
    const nextParam = params['next'];
    const forcedPartnerIdParam = params['forcedPartnerId'];
    const partnerIdParam = params['partnerId'] ?? forcedPartnerIdParam;
    if (!nextParam && !partnerIdParam) {
      return;
    }
    const parsedPartnerId = partnerIdParam ? this.#parsePartnerId(partnerIdParam) : null;
    if (!nextParam) {
      this.#assignPartnerIdIfValid(parsedPartnerId);
      return;
    }
    if (!partnerIdParam && nextParam !== this.redirectUrl) {
      const partnerIdFromNext = this.#getPartnerIdFromUrl(nextParam);
      this.#assignPartnerIdIfValid(partnerIdFromNext);
      this.redirectUrl = this.#sanitizeRedirectUrl(nextParam);
      return;
    }
    if (partnerIdParam) {
      if (nextParam === this.redirectUrl) {
        this.#assignPartnerIdIfValid(parsedPartnerId);
        return;
      }
      if (parsedPartnerId !== null) {
        this.partnerId = parsedPartnerId;
        this.redirectUrl = this.#sanitizeRedirectUrl(this.#updatePartnerIdInUrl(nextParam, parsedPartnerId));
      } else {
        const partnerIdFromNext = this.#getPartnerIdFromUrl(nextParam);
        this.#assignPartnerIdIfValid(partnerIdFromNext);
        this.redirectUrl = this.#sanitizeRedirectUrl(nextParam);
      }
    }
  }

  #assignPartnerIdIfValid(partnerId: number | null): void {
    if (partnerId !== null) {
      this.partnerId = partnerId;
    }
  }

  // A pick that is still resolving its role must not enter after the user picked another organization or logged out.
  #cancelPendingOrganizationRole(): void {
    if (this.#pendingOrganizationRole === null) {
      return;
    }
    this.#pendingOrganizationRole.unsubscribe();
    this.#pendingOrganizationRole = null;
    this.#spinnerService.hide();
  }

  #checkCanShowNfcLogin(): boolean {
    return (this.#checkIsDualScreenAvailable() && this.#checkIsNfcVersionCompatible()) || this.#nfcLoginMobilePosSerial !== null;
  }

  #checkIsDualScreenAvailable(): boolean {
    return this.#dualScreenStorageService.containsData();
  }

  #checkIsNfcVersionCompatible(): boolean {
    const dualScreenData: DualScreenData | null = this.#dualScreenStorageService.getData();
    if (dualScreenData === null) {
      return false;
    }
    const versionApp: string | null | undefined = dualScreenData.versionApp;
    if (versionApp == null || !isString(versionApp)) {
      return false;
    }
    return isSemanticVersionGreaterOrEqual(versionApp, '1.6.0');
  }

  // Entering without the role would start the session without it and wipe the stored selection, so the pick stays retryable.
  #failOrganizationPick(): void {
    this.isLoadingOrganizations = false;
    this.#changeDetectorRef.markForCheck();
    this.#spinnerService.hide();
    this.#dialogService.openMessageModal(this.#translate.instant('common.errorTitle'), this.#translate.instant('errors.generic'));
  }

  #fetchPreselectedOrganizationRole(partnerId: number, options?: { enterWithoutRole?: boolean }): void {
    const enterWithoutRole = options?.enterWithoutRole ?? true;
    const userId: number | null = this.#authenticationService.getUserId();
    if (userId === null) {
      this.logout();
      return;
    }
    this.#refreshBookingAgentsVisibility();
    this.#spinnerService.show();
    this.#pendingOrganizationRole = this.#userService
      .getOrganizations({
        includeRole: true,
        itemsPerPage: 1,
        operatingPlatform: 'feverzone',
        organizationIds: [partnerId],
        page: 1,
        search: null,
        showBookingAgents: true,
        showDeleted: this.showDeleted,
        userId,
      })
      .pipe(this.#untilDestroyedWhenHidingBusinessPartners())
      .subscribe({
        error: () => {
          this.#pendingOrganizationRole = null;
          if (!enterWithoutRole) {
            this.#failOrganizationPick();
            return;
          }
          this.#userService.setSelectedOrganizationRole(null);
          this.#selectOrganizationWithoutRoleSyncFromOrganizations(partnerId);
        },
        next: response => {
          this.#pendingOrganizationRole = null;
          const org = response?.data?.organizations[0];
          if (org === undefined && !enterWithoutRole) {
            this.#failOrganizationPick();
            return;
          }
          if (org === undefined) {
            this.#showSelectorInsteadOfPreselectedOrganization();
            return;
          }
          if (!this.organizations.some(o => o.id === org.id)) {
            this.organizations = this.organizations.concat([org]);
          }
          this.#userService.setSelectedOrganizationRole(org.userRoleInOrganization ?? null);
          this.#selectOrganizationWithoutRoleSyncFromOrganizations(partnerId);
        },
      });
  }

  #getNfcLoginMobilePosSerial(): string | null {
    return this.#checkIsDualScreenAvailable() ? null : this.#mobilePosNfcCardReadService.getMobilePosSerial();
  }

  #getPartnerIdFromUrl(url: string): number | null {
    try {
      const urlObj = new URL(url, this.#getUrlBase());
      const partnerIdParam = urlObj.searchParams.get('forcedPartnerId') ?? urlObj.searchParams.get('partnerId');
      return this.#parsePartnerId(partnerIdParam);
    } catch {
      return null;
    }
  }

  #getUrlBase(): string {
    const origin = window.location.origin ?? '';
    return origin.startsWith('http') ? `${origin}/` : 'http://localhost/';
  }

  #getUserOrganizations(): void {
    const userId: number | null = this.#authenticationService.getUserId();
    if (userId === null) {
      this.logout();
      return;
    }
    const continuingList = this.#continuingList;
    this.#continuingList = false;
    if (!continuingList) {
      this.#listRequestId += 1;
    }
    const requestId = this.#listRequestId;
    const pilotRead = this.#includeBusinessOrganizations;
    if (this.organizations.length === 0 && !continuingList) {
      this.#hiddenOrganizations = [];
    }
    // Re-evaluate only when the list is reset (first page / search / showDeleted), never mid-pagination:
    // loadMore appends to `organizations`, so re-reading the flag per page could concatenate collections
    // fetched with different `include_booking_agents` values (duplicated/skipped orgs).
    if (this.organizations.length === 0) {
      this.#refreshBookingAgentsVisibility();
    }
    this.#userService
      .getOrganizations({
        includeRole: true,
        itemsPerPage: this.#nextItemsPerPage || this.#initialItemsPerPage,
        operatingPlatform: 'feverzone',
        page: this.nextPage || this.#initialPage,
        ...(this.#includeBusinessOrganizations ? { organizationCategory: 'distributors' as const } : {}),
        search: this.searchParam || null,
        showBookingAgents: this.showBookingAgents || this.#includeBusinessOrganizations,
        showDeleted: this.showDeleted,
        userId,
      })
      .pipe(this.#untilDestroyedWhenHidingBusinessPartners())
      .subscribe({
        error: () => {
          if (this.#isStaleListRequest(requestId, pilotRead)) {
            return;
          }
          this.isLoadingOrganizations = false;
          this.#changeDetectorRef.markForCheck();
          this.#spinnerService.hide();
          this.#dialogService.openMessageModal(this.#translate.instant('common.errorTitle'), this.#translate.instant('errors.generic'));
          this.logout();
        },
        next: response => {
          if (this.#isStaleListRequest(requestId, pilotRead)) {
            return;
          }
          if (response?.data) {
            const listedOrganizations = this.#includeBusinessOrganizations
              ? this.#businessAsOrganizationFlag.pilotBusinessOrganizations(response.data.organizations, this.organizations)
              : response.data.organizations;
            const fetchedOrganizations = this.showBookingAgents
              ? hideBusinessPartnerOrganizations(listedOrganizations)
              : listedOrganizations;
            this.#hiddenOrganizations = this.#hiddenOrganizations.concat(
              listedOrganizations.filter(organization => !fetchedOrganizations.includes(organization)),
            );
            this.organizations = this.organizations.concat(fetchedOrganizations);

            const nextPage = response.getNextPaginationPage();
            // The service stores the unfiltered total on every list call, so the visible count is stored after each one.
            if (
              (this.showBookingAgents || this.#includeBusinessOrganizations) &&
              nextPage === null &&
              this.searchParam === '' &&
              this.organizations.length > 0
            ) {
              this.#userService.setNumberOfOrganizations(new Set(this.organizations.map(organization => organization.id)).size);
            }
            if (this.partnerId !== null) {
              const preselectedOrganization = this.organizations.find(organization => organization.id === this.partnerId);
              if (preselectedOrganization) {
                this.#userService.setSelectedOrganizationRole(preselectedOrganization.userRoleInOrganization ?? null);
                this.#selectOrganizationWithoutRoleSyncFromOrganizations(this.partnerId);
                return;
              }
              this.#fetchPreselectedOrganizationRole(this.partnerId);
              return;
            }
            if (this.#shouldLoadNextPageBeforeDeciding(nextPage, fetchedOrganizations.length)) {
              this.#nextItemsPerPage = response.getNextPaginationItemsPerPage();
              this.nextPage = nextPage;
              this.#continuingList = true;
              this.#getUserOrganizations();
              return;
            }
            if (this.#includeBusinessOrganizations && nextPage !== null) {
              this.#nextItemsPerPage = response.getNextPaginationItemsPerPage();
              this.nextPage = nextPage;
              this.#continuingList = true;
              this.#getUserOrganizations();
              return;
            }
            if (this.#shouldReadBusinessOrganizations(nextPage, requestId)) {
              this.#includeBusinessOrganizations = true;
              this.nextPage = this.#initialPage;
              this.#nextItemsPerPage = PILOT_BUSINESS_ORGANIZATIONS_PAGE_SIZE;
              this.#getUserOrganizations();
              return;
            }
            if (this.showBookingAgents && nextPage === null && this.organizations.length === 0 && this.searchParam === '') {
              this.organizations = this.#hiddenOrganizations;
            }
            if (this.organizations?.length === 1 && this.searchParam === '') {
              const selectedOrganization = this.organizations[0];
              this.#userService.setSelectedOrganizationRole(selectedOrganization.userRoleInOrganization ?? null);
              this.partnerId = selectedOrganization.id;
              this.#selectOrganizationWithoutRoleSyncFromOrganizations(this.partnerId);
              return;
            }
            this.noOrganizationsFound = this.organizations?.length === 0 && this.searchParam === '';
            this.organizationsOnlyOnMarketplace =
              this.noOrganizationsFound && response.data.otherOperatingPlatforms.includes('b2b_marketplace');
            this.#nextItemsPerPage = response.getNextPaginationItemsPerPage();
            this.nextPage = nextPage;
            this.isLoadingOrganizations = false;
            this.#changeDetectorRef.markForCheck();
            if (!this.#hasPreselectedOrganization()) {
              this.#spinnerService.hide();
            }
          } else {
            this.#spinnerService.hide();
            this.#datadogLogService.logWarn('Login: getUserOrganizations failed', {
              errorJson: this.#safeStringify(response.error),
              source: 'login.getUserOrganizations',
            });
            this.#dialogService.openMessageModal(
              this.#translate.instant('common.errorTitle'),
              this.#translate.instant(response.error?.message ?? ''),
            );
            this.logout();
          }
        },
      });
  }

  #handleNFCCardRead(nfcData: NFCCardRead): void {
    if (this.#nfcInfoDialogRef !== null) {
      this.#nfcInfoDialogRef.close();
      this.#nfcInfoDialogRef = null;
    }
    this.nfcCardData.set(nfcData.UID);
    this.showNfcPinPad.set(true);
    this.#changeDetectorRef.markForCheck();
  }

  #hasPreselectedOrganization(): boolean {
    return this.partnerId !== null;
  }

  // Replaced by a search, a pick or a logout; only with the flag on or on a pilot read, so the login is unchanged with it off.
  #isStaleListRequest(requestId: number, pilotRead: boolean): boolean {
    return (this.showBookingAgents || pilotRead) && requestId !== this.#listRequestId;
  }

  #loadOrganizationsWithControlPanelContextPriming(): void {
    this.isLoadingOrganizations = true;
    this.#organizationPreferencesService.load();
    this.#getUserOrganizations();
    this.#primeControlPanelAccessContext().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  #parsePartnerId(partnerIdParam: string | null): number | null {
    const parsedPartnerIdParam = parseInt(partnerIdParam ?? '', 10);
    return !isNaN(parsedPartnerIdParam) ? parsedPartnerIdParam : null;
  }

  #prepareOrganizationSelector(): void {
    const partnerId = this.partnerId;
    const redirectUrl = this.redirectUrl;

    this.#resetOrganizationSelectorParams();
    this.partnerId = partnerId;
    this.redirectUrl = redirectUrl;
    this.#loadOrganizationsWithControlPanelContextPriming();
  }

  #primeControlPanelAccessContext(): Observable<unknown> {
    const cachedUser = this.#userService.getUser();
    if (cachedUser) {
      this.#controlPanelAccessContextService.applyAccessContext(cachedUser);
      this.#changeDetectorRef.markForCheck();
      return EMPTY;
    }

    this.#controlPanelAccessContextService.applyAccessContext(null);

    return this.#userService.getMe({ skipBusinessDetailsEnrichment: true }).pipe(
      tap(response => {
        this.#controlPanelAccessContextService.applyAccessContext(response?.data ?? null);
        this.#changeDetectorRef.markForCheck();
      }),
      catchError(() => EMPTY),
      take(1),
    );
  }

  #readConfigPartner(): void {
    this.#partnerConfigService.$config.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      error: (error: unknown) => {
        throw new Error(`Error reading config partner: ${JSON.stringify(error)}`);
      },
      next: (config: PartnerConfig | null) => {
        this.logo.set(config?.login?.showLogo ? (config?.brand?.feverzoneLogoHeader ?? '') : '');
        this.banner.set(config?.login?.banner ?? '');
      },
    });
  }

  #refreshBookingAgentsVisibility(): void {
    this.showBookingAgents = this.#includeBusinessOrganizations || this.#businessAsOrganizationFlag.isEnabledGlobally();
  }

  #resetOrganizationSelectorParams(): void {
    this.searchParam = '';
    this.organizations = [];
    this.#page = 1;
    this.nextPage = null;
    this.#nextItemsPerPage = null;
    this.isLoadingOrganizations = false;
  }

  #safeStringify(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  #sanitizeRedirectUrl(url: string): string {
    return isLogoutRouteUrl(url) ? AuthenticationService.defaultRedirectUrl : url;
  }

  #selectOrganizationWithoutRoleSyncFromOrganizations(organizationId: number): void {
    this.selectOrganization(organizationId, { syncRoleFromOrganizations: false });
  }

  // A page of only hidden organizations adds nothing to the list, so the scroll that asked for it never fires
  // again: keep reading until it shows something or pagination ends.
  #shouldLoadNextPageBeforeDeciding(nextPage: number | null, visibleFetchedCount: number): boolean {
    return (
      this.showBookingAgents &&
      nextPage !== null &&
      nextPage > (this.nextPage || this.#initialPage) &&
      (this.organizations.length < LoginComponent.pageSize || visibleFetchedCount === 0)
    );
  }

  // A logout, search or pick since the read started replaced it, so its answer must not start another read.
  #shouldReadBusinessOrganizations(nextPage: number | null, requestId: number): boolean {
    return (
      requestId === this.#listRequestId &&
      !this.showBookingAgents &&
      !this.#includeBusinessOrganizations &&
      !this.showDeleted &&
      nextPage === null &&
      this.searchParam === ''
    );
  }

  #showSelectorInsteadOfPreselectedOrganization(): void {
    this.partnerId = null;
    this.redirectUrl = AuthenticationService.defaultRedirectUrl;
    this.#resetOrganizationSelectorParams();
    this.isLoadingOrganizations = true;
    this.#getUserOrganizations();
  }

  #subscribeToNFCMessage(): void {
    this.#webviewMessenger
      .observe<NFCCardRead>(MessageType.NFCCardRead)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (error: unknown) => {
          throw new Error(`Error subscribing to NFC message: ${JSON.stringify(error)}`);
        },
        next: (nfcData: NFCCardRead) => {
          this.#handleNFCCardRead(nfcData);
        },
      });
  }

  #untilDestroyedWhenHidingBusinessPartners<T>(): MonoTypeOperatorFunction<T> {
    return this.showBookingAgents ? takeUntilDestroyed<T>(this.#destroyRef) : (source: Observable<T>) => source;
  }

  #updatePartnerIdInUrl(url: string, partnerId: number): string {
    const urlObj = new URL(url, this.#getUrlBase());
    urlObj.searchParams.set('partnerId', partnerId.toString());
    return urlObj.pathname + urlObj.search;
  }
}
