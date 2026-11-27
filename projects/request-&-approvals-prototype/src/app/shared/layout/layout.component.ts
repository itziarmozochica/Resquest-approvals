import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Signal,
  signal,
  TemplateRef,
  untracked,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';

import { EntryPointClient } from '@fz-original/app/app/enums/entry-point-client.enum';
import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { OpenChatbotEntryPoint } from '@fz-original/app/modules/reports/fz-assistant-view/tracking/events/open-chatbot.event';
import { IgntDialogService } from '@ignite/common';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest, fromEvent } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith, switchMap, tap } from 'rxjs/operators';

import { ImpersonationService } from '../../core/authentication/impersonation.service';
import { ShiftReminderLogoutService } from '../../core/authentication/shift-reminder-logout.service';
import { IncidenceReportModalComponent } from '../../incidence-report/containers/incidence-report-modal/incidence-report-modal.component';
import { DistributorGroupPublicationToastsService } from '../../modules/b2b-publishing/services/distributor-group-publication-toasts.service';
import { OnsiteSetupsStorageService } from '../../modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { AuthenticatedMfaEnrollmentDialogService } from '../../modules/user/authenticated-mfa-enrollment/authenticated-mfa-enrollment-dialog.service';
import { MfaLearnMoreDialogService } from '../../modules/user/mfa-learn-more/mfa-learn-more-dialog.service';
import { MenuItem } from '../models/header/header.model';
import { Partner } from '../models/partner/partner.model';
import { FeatureFlags } from '../optimizely/feature-flags';
import { OptimizelyService } from '../optimizely/optimizely.service';
import { ChatbotFacade } from '../services/chatbot/chatbot.facade';
import { CustomerServiceChatFacade } from '../services/customer-service-chat/customer-service-chat.facade';
import { DualScreenStorageService } from '../services/dual-screen/dual-screen-storage.service';
import { EntryPointClientService } from '../services/entry-point-client/entry-point-client.service';
import { FzAssistantDockUiService } from '../services/fz-assistant/fz-assistant-dock-ui.service';
import { HeaderStateService } from '../services/header/header-state.service';
import { PartnerService } from '../services/partner/partner.service';
import { ZendeskService } from '../services/script-loader/zendesk/zendesk.service';
import { ToastService } from '../services/toast/toast.service';
import { UserMfaStatusService } from '../services/user/user-mfa-status.service';
import { UserService } from '../services/user/user.service';
import { getFzAssistantDockAutoOpenFromRouteSnapshot, getFzAssistantDockFromRouteSnapshot } from '../utils/fz-assistant-route.util';
import { TOGGLE_FOOTER_EVENT_KEY } from './footer/toggle-footer-event-key';
import { CreateEventVisibilityService } from './header/create-event-visibility.service';
import { toLogoutMenuEntry } from './utils/logout-menu-entry.util';

@Component({
  selector: 'app-layout',
  standalone: false,
  styleUrls: ['./layout.component.scss'],
  templateUrl: './layout.component.html',
})
export class LayoutComponent {
  readonly #breakpointStateService = inject(BreakpointStateService);
  readonly #chatbotFacade = inject(ChatbotFacade);
  readonly fzAssistantDockUi = inject(FzAssistantDockUiService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #headerStateService = inject(HeaderStateService);
  readonly #impersonationService = inject(ImpersonationService);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #dialogService = inject(IgntDialogService);
  readonly #entryPointClientService = inject(EntryPointClientService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #publicationToastsService = inject(DistributorGroupPublicationToastsService);
  readonly #shiftReminderLogoutService = inject(ShiftReminderLogoutService);
  readonly #translateService = inject(TranslateService);
  readonly #createEventVisibilityService = inject(CreateEventVisibilityService);
  readonly #authenticatedMfaEnrollmentDialog = inject(AuthenticatedMfaEnrollmentDialogService);
  readonly #mfaLearnMoreDialog = inject(MfaLearnMoreDialogService);
  readonly #userMfaStatus = inject(UserMfaStatusService);
  readonly #customerServiceChatFacade = inject(CustomerServiceChatFacade);
  readonly #zendeskService = inject(ZendeskService);
  /** The flag resolves after login, after the menu is first built, so the menu is rebuilt when it does. */

  alertSentiment = AlertSentiment;
  readonly fzAssistantTopBarEntryTemplate: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('fzAssistantTopBarEntryTemplate');
  isDualScreen = false;
  isFooterActive: WritableSignal<boolean> = signal<boolean>(true);
  readonly isImpersonating: Signal<boolean> = this.#impersonationService.isImpersonating;
  readonly isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  readonly #isKioskUrl: Signal<boolean>;
  readonly #isOneStopShopMode: WritableSignal<boolean> = signal<boolean>(false);
  readonly isOneStopShopMode: Signal<boolean> = this.#isOneStopShopMode.asReadonly();
  isSidebarOpen = false;
  readonly isTablet: Signal<boolean> = this.#breakpointStateService.getStateProp('isTablet');
  readonly #chatbotSidebarRouteEligible = signal<boolean>(false);
  readonly #mfaSetupRequiredBannerHeightPx = signal(0);
  /**
   * Hidden while enrollment or learn-more is open so CDK BlockScrollStrategy cannot desync the
   * fixed banner from the header after scroll.
   *
   * Discarded:
   * - keep `position: fixed` → header leaves, banner stays (gap above banner)
   * - `position: absolute` pin → same desync inverted (gap under header)
   * - compensate `top`/translate for CDK offset → fragile across both dialogs
   * - keep the height offset while hidden (avoid reflow) → empty strip under the header
   *
   * Height clears to 0 with the banner; content may reflow behind the dialog backdrop.
   * Longer write-up: PR #16533.
   */
  readonly showMfaSetupRequiredBanner: Signal<boolean> = computed((): boolean => {
    const isEnrollmentDialogOpen: boolean = this.#authenticatedMfaEnrollmentDialog.isOpen();
    const isLearnMoreDialogOpen: boolean = this.#mfaLearnMoreDialog.isOpen();
    const isSetupRequired: boolean = this.#userMfaStatus.isSetupRequired();

    return isSetupRequired && !isEnrollmentDialogOpen && !isLearnMoreDialogOpen && !this.isKiosk();
  });
  /**
   * Measured MFA banner height for sticky / content offsets.
   * `null` while waiting for the first measurement so the SCSS 72px fallback applies.
   * `0` when the banner is hidden.
   */
  readonly mfaSetupRequiredBannerHeightPx: Signal<number | null> = computed((): number | null => {
    const bannerVisible: boolean = this.showMfaSetupRequiredBanner();
    const measuredHeightPx: number = this.#mfaSetupRequiredBannerHeightPx();

    if (!bannerVisible) {
      return 0;
    }

    return measuredHeightPx > 0 ? measuredHeightPx : null;
  });
  readonly showFzAssistantTopBarEntry: Signal<boolean> = computed(() => {
    if (!this.#chatbotSidebarRouteEligible()) {
      return false;
    }

    if (!this.isMobile()) {
      return true;
    }

    return !this.#isCreateEventVisibleOnMobile();
  });
  /**
   * Mobile-only sidebar entry to the Fz Assistant, shown only when the header chip is hidden
   * (e.g. the create-event control takes its place). Desktop/tablet keep the header chip, and we
   * never render both at once so the assistant surface has a single entry point per breakpoint.
   */
  readonly showFzAssistantSidebarEntry: Signal<boolean> = computed(
    () => this.isMobile() && this.#chatbotSidebarRouteEligible() && !this.showFzAssistantTopBarEntry(),
  );

  constructor(
    private partnerService: PartnerService,
    private userService: UserService,
    private toastService: ToastService,
    public router: Router,
    dualScreenStorageService: DualScreenStorageService,
  ) {
    this.isDualScreen = dualScreenStorageService.containsData();
    this.#isKioskUrl = toSignal(
      router.events.pipe(
        map(() => router.url.includes('/kiosk/')),
        distinctUntilChanged(),
      ),
      { initialValue: router.url.includes('/kiosk/') },
    );
    this.isRequestsApprovalUrl = toSignal(
      router.events.pipe(
        map(() => router.url.includes('/project-management')),
        distinctUntilChanged(),
      ),
      { initialValue: router.url.includes('/project-management') },
    );
    this.#initializeChatbotButton();
    if (this.isDualScreen) {
      this.isFooterActive.set(false);
    }
    this.#initializeToggleFooterEvent();
    this.#initializeGlobalMenuItems();
    this.#initializeHeaderActionClickedEvent();
    this.#initializeFzAssistantTopBarEntry();
    this.#publicationToastsService.watch();
  }

  getPartner(): Partner | null {
    return this.partnerService.getPartner();
  }

  /**
   * The dock shares the content row with the routed view, so it is gated on the partner chrome being
   * rendered. That used to be implicit in the template nesting; the content row now sits outside the
   * kiosk conditional (see `layout.component.html`), so the kiosk check has to be explicit here.
   */
  get isFzAssistantDockVisible(): boolean {
    return !this.isKiosk() && this.fzAssistantDockUi.dockRouteEligible() && this.fzAssistantDockUi.panelOpen() && !this.isMobile();
  }

  /** Requests & Approval pages paint a white page background instead of the default grey. */
  readonly isRequestsApprovalUrl: Signal<boolean>;

  isKiosk(): boolean {
    return this.userService.isKioskUser() || this.isKioskEmulatedInFZ();
  }

  isKioskEmulatedInFZ(): boolean {
    return this.#isKioskUrl() && !this.userService.isKioskUser();
  }

  isOrganizationSelected(): boolean {
    return Boolean(this.partnerService.getPartner());
  }

  onMfaSetupRequiredBannerHeightChange(heightPx: number): void {
    this.#mfaSetupRequiredBannerHeightPx.set(heightPx);
  }

  onOneStopShopModeChange(isOneStopShopMode: boolean): void {
    this.#isOneStopShopMode.set(isOneStopShopMode);
  }

  toggleSidebarEvent(open: boolean): void {
    this.isSidebarOpen = open;
  }

  #initializeChatbotButton(): void {
    const routeChanges$ = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
    );

    combineLatest([this.partnerService.partner$(), this.userService.observePermissions().pipe(startWith(0)), routeChanges$])
      .pipe(
        switchMap(([partner]: [Partner | null, unknown, unknown]) => {
          const isExcludedRoute = this.#chatbotFacade.isRouteExcluded(this.router.url);
          const routeRoot = this.router.routerState.snapshot.root;
          const dockFromRoute = getFzAssistantDockFromRouteSnapshot(routeRoot);
          return this.#chatbotFacade.canAccessFzAssistantForLayoutShell$(this.router.url).pipe(
            startWith(false),
            map((shellAccess: boolean) => {
              const shouldShow = shellAccess && !isExcludedRoute;
              const dockRouteEligible = dockFromRoute !== 'off' && shouldShow && !this.isMobile() && !this.isTablet();
              const partnerId = partner?.id ?? null;
              const isChatbotAutoOpenEnabled =
                partnerId !== null &&
                (this.#optimizelyService.isFeatureEnabled(FeatureFlags.ENABLE_CHATBOT_AUTOMATIC_OPENING, {
                  partner_id: partnerId.toString(),
                }) ??
                  false);
              const shouldTryDockAutoOpen =
                dockRouteEligible && isChatbotAutoOpenEnabled && getFzAssistantDockAutoOpenFromRouteSnapshot(routeRoot);
              return {
                dockRouteEligible,
                partnerId,
                shouldShow,
                shouldTryDockAutoOpen,
              };
            }),
          );
        }),
        distinctUntilChanged(
          (
            prev: {
              dockRouteEligible: boolean;
              partnerId: number | null;
              shouldShow: boolean;
              shouldTryDockAutoOpen: boolean;
            },
            curr: {
              dockRouteEligible: boolean;
              partnerId: number | null;
              shouldShow: boolean;
              shouldTryDockAutoOpen: boolean;
            },
          ) =>
            prev.shouldShow === curr.shouldShow &&
            prev.partnerId === curr.partnerId &&
            prev.dockRouteEligible === curr.dockRouteEligible &&
            prev.shouldTryDockAutoOpen === curr.shouldTryDockAutoOpen,
        ),
        tap(
          ({
            dockRouteEligible,
            shouldShow,
            shouldTryDockAutoOpen,
          }: {
            dockRouteEligible: boolean;
            partnerId: number | null;
            shouldShow: boolean;
            shouldTryDockAutoOpen: boolean;
          }) => {
            this.#chatbotSidebarRouteEligible.set(shouldShow);
            this.fzAssistantDockUi.setDockRouteEligible(dockRouteEligible);
            if (shouldTryDockAutoOpen && this.fzAssistantDockUi.canAutoOpen()) {
              this.#chatbotFacade.setEntryPoint(OpenChatbotEntryPoint.autoOpen);
              this.fzAssistantDockUi.tryAutoOpen();
            }
          },
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #initializeFzAssistantTopBarEntry(): void {
    effect(() => {
      const shouldShow: boolean = this.showFzAssistantTopBarEntry();
      const template: TemplateRef<unknown> | undefined = this.fzAssistantTopBarEntryTemplate();
      untracked(() => {
        if (shouldShow && template) {
          this.#headerStateService.setCenterAdjacentContent(template);
        } else {
          this.#headerStateService.clearCenterAdjacentContent();
        }
      });
    });
  }

  /**
   * The menu is rebuilt when the entry point changes: on Funlab the `appConfig` handshake that sets `odoo` often
   * lands after the shell is built, and the logout item has to turn into the till lock then, like the sidebar's.
   */
  #initializeGlobalMenuItems(): void {
    effect(() => {
      const entryPointClient = this.#entryPointClientService.entryPointClient();
      const areNewEntryPointsEnabled = this.#zendeskService.areNewEntryPointsEnabled();
      untracked(() => this.#registerGlobalMenuItems(entryPointClient, areNewEntryPointsEnabled));
    });
  }

  #initializeHeaderActionClickedEvent(): void {
    this.#headerStateService.actionClicked$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(actionId => {
      if (actionId === 'my-profile') {
        void this.router.navigate(['/profile']);
      }
      if (actionId === 'logout') {
        this.#logout();
      }
      if (actionId === 'share-universal-link') {
        this.#shareUniversalLink();
      }
      if (actionId === 'report-incidence') {
        this.#openIncidenceReport();
      }
      if (actionId === 'contact-support') {
        this.#customerServiceChatFacade.open('profile_menu');
      }
    });
  }

  #initializeToggleFooterEvent(): void {
    fromEvent<CustomEvent<{ isActive: boolean }>>(window, TOGGLE_FOOTER_EVENT_KEY)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(event => {
        queueMicrotask(() => {
          if (!this.isDualScreen) {
            this.isFooterActive.set(event.detail?.isActive ?? true);
          }
        });
      });
  }

  #isCreateEventVisibleOnMobile(): boolean {
    return this.#createEventVisibilityService.isAvailable(this.isOneStopShopMode());
  }

  #logout(): void {
    this.#shiftReminderLogoutService.logout().subscribe();
  }

  #openIncidenceReport(): void {
    this.#dialogService.openModal<boolean>(IncidenceReportModalComponent);
  }

  #registerGlobalMenuItems(entryPointClient: EntryPointClient, areNewEntryPointsEnabled: boolean): void {
    const items: MenuItem[] = [];
    if (!this.userService.isKioskUser()) {
      items.push({
        icon: ['fal', 'user'],
        id: 'my-profile',
        igntIcon: { name: 'user', variant: 'light' },
        label: this.#translateService.instant('header.myProfile'),
      });
    }
    items.push({
      icon: ['fal', 'share-alt'],
      id: 'share-universal-link',
      igntIcon: { name: 'share-alt', variant: 'light' },
      label: this.#translateService.instant('header.shareLink'),
    });
    const isReportIncidenceEnabled = this.#optimizelyService.isFeatureEnabled(FeatureFlags.REPORT_INCIDENCE);
    if (isReportIncidenceEnabled) {
      items.push({
        icon: ['fal', 'bug'],
        id: 'report-incidence',
        igntIcon: { name: 'bug', variant: 'light' },
        label: this.#translateService.instant('header.reportIncidence'),
      });
    }
    if (areNewEntryPointsEnabled) {
      items.push({
        icon: ['fal', 'user-headset'],
        id: 'contact-support',
        igntIcon: { name: 'user-headset', variant: 'light' },
        label: this.#translateService.instant('header.contactSupport'),
      });
    }
    const logoutMenuEntry = toLogoutMenuEntry(entryPointClient);
    items.push({
      icon: logoutMenuEntry.icon,
      id: 'logout',
      igntIcon: logoutMenuEntry.igntIcon,
      label: this.#translateService.instant(logoutMenuEntry.headerLabelKey),
    });
    this.#headerStateService.setGlobalMenuItems(items);
  }

  async #shareUniversalLink(): Promise<void> {
    try {
      const partner = this.partnerService.getPartner();
      if (!partner?.id) {
        return;
      }
      const url = new URL(window.location.href, window.location.origin);
      url.searchParams.set('forcedPartnerId', partner.id.toString());
      const onsiteSetupId = this.#onsiteSetupsStorageService.getConfiguration()?.id;
      if (onsiteSetupId) {
        url.searchParams.set('forcedOnsiteSetupId', onsiteSetupId);
      }
      await navigator.clipboard.writeText(url.toString());
      this.toastService.add({
        autoHide: true,
        delay: 3000,
        message: this.#translateService.instant('header.shareLinkCopiedToClipboard'),
        sentiment: AlertSentiment.positive,
      });
    } catch {
      this.toastService.add({
        autoHide: true,
        delay: 3000,
        message: this.#translateService.instant('header.shareLinkCopiedFailed'),
        sentiment: AlertSentiment.danger,
      });
    }
  }
}
