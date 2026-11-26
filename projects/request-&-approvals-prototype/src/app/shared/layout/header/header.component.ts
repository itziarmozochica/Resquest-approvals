import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Input, Signal, TemplateRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';

import { EntryPointClient } from '@fz-original/app/app/enums/entry-point-client.enum';
import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { OssShiftWidgetComponent } from '@fz-original/app/modules/box-office/one-stop-shop/components/oss-shift-widget/oss-shift-widget.component';
import { NotificationsButtonComponent } from '@fz-original/app/modules/inbox-notifications/components/notifications-button/notifications-button.component';
import { HeaderStateService } from '@fz-original/app/shared/services/header/header-state.service';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { filter, map, scan } from 'rxjs/operators';

import { OboSecondScreenDataService } from '../../../modules/box-office/obo-second-screen/services/obo-second-screen-data.service';
import { OboFlowTypeEnum, ShiftStrategyEnum } from '../../../modules/box-office/shared/models/onsite-setup';
import { OnsiteSetupsStorageService } from '../../../modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { PartnerModule } from '../../../modules/partner/partner.module';
import { PermissionBaseModule } from '../../directives/permission-based/permission-base.module';
import { IconsModule } from '../../icons/icons.module';
import { Partner } from '../../models/partner/partner.model';
import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { ChatbotFacade } from '../../services/chatbot/chatbot.facade';
import { DualScreenStorageService } from '../../services/dual-screen/dual-screen-storage.service';
import { EntryPointClientService } from '../../services/entry-point-client/entry-point-client.service';
import { CAPN_ID, PartnerService } from '../../services/partner/partner.service';
import { ZendeskService } from '../../services/script-loader/zendesk/zendesk.service';
import { Permissions } from '../../services/user/permissions';
import { UserService } from '../../services/user/user.service';
import { PlanRequestCreateVisibilityService } from '../create-event-entry/plan-request-create-visibility.service';
import { CreateNewEventModule } from '../create-new-event/create-new-event.module';
import { HeaderActionButtonComponent } from '../header-action-button/header-action-button.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ZendeskLauncherComponent } from '../zendesk-launcher/zendesk-launcher.component';
import { CreateEventVisibilityService } from './create-event-visibility.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.headerbar--dual-screen]': 'isDualScreen',
    '[class.headerbar--patrimonio]': 'isPatrimonioPartner()',
  },
  imports: [
    HeaderActionButtonComponent,
    IconsModule,
    IgntIconButtonComponent,
    NgTemplateOutlet,
    NotificationsButtonComponent,
    OssShiftWidgetComponent,
    PartnerModule,
    PermissionBaseModule,
    CreateNewEventModule,
    ZendeskLauncherComponent,
  ],
  selector: 'app-header',
  styleUrl: '../../../../theme/components/navigation/headerbar/headerbar.scss',
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  readonly #breakpointStateService = inject(BreakpointStateService);
  readonly #chatbotFacade = inject(ChatbotFacade);
  readonly #defaultFeverzoneLogo = 'assets/images/logos/feverzone.svg';
  readonly #oboSecondScreenDataService: OboSecondScreenDataService = inject(OboSecondScreenDataService);
  readonly #entryPointClientService = inject(EntryPointClientService);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #partnerService: PartnerService = inject(PartnerService);
  readonly #createEventVisibilityService = inject(CreateEventVisibilityService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #planRequestCreateVisibility = inject(PlanRequestCreateVisibilityService);
  readonly #router = inject(Router);
  readonly #currentUrl: Signal<string> = toSignal(
    this.#router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.#router.url),
    ),
    { initialValue: this.#router.url },
  );
  readonly #userService = inject(UserService);
  readonly #zendeskService = inject(ZendeskService);

  readonly headerStateService = inject(HeaderStateService);
  protected readonly isDualScreen = inject(DualScreenStorageService).containsData();
  centerContent: Signal<TemplateRef<unknown> | null> = this.headerStateService.getStateProp('centerContent');
  feverzoneLogo: string;
  isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  @Input() isOneStopShopMode = false;
  isTablet: Signal<boolean> = this.#breakpointStateService.getStateProp('isTablet');
  readonly Permissions = Permissions;
  readonly #permissionsChange = toSignal(this.#userService.observePermissions().pipe(scan((version: number) => version + 1, 0)), {
    initialValue: 0,
  });
  readonly canShowHeaderCreateEvent = computed(() => {
    this.#permissionsChange();
    return (
      this.#userService.hasPermission(Permissions.CAN_CREATE_PLANS) || this.#planRequestCreateVisibility.canShowCreateRequestDropdown()
    );
  });
  readonly onsiteSetupName: Signal<string | null> = computed(() =>
    this.#entryPointClientService.entryPointClient() === EntryPointClient.Odoo
      ? (this.#onsiteSetupsStorageService.onsiteSetup()?.name ?? null)
      : null,
  );
  readonly showShiftWidget: Signal<boolean> = computed(() => {
    const onsiteSetup = this.#onsiteSetupsStorageService.onsiteSetup();
    return onsiteSetup?.obo_flow_type === OboFlowTypeEnum.one_stop_shop && onsiteSetup.shift_strategy !== ShiftStrategyEnum.disabled;
  });
  readonly shouldShowNotifications = computed(() => {
    this.#permissionsChange();
    const currentUrl = this.#currentUrl();
    if (currentUrl.startsWith('/box-office') || currentUrl.startsWith('/analytics/notifications')) {
      return false;
    }

    return (
      this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.ENABLE_INBOX_NOTIFICATIONS, team: 'data' }) === true &&
      this.#chatbotFacade.canAccessFromReports()
    );
  });

  protected readonly shouldShowZendesk: Signal<boolean> = this.#zendeskService.isHeaderLauncherVisible;

  @Input() sidebar!: SidebarComponent;
  readonly sidebarToogleIconClose = 'assets/images/icons/aside-menu-icon-hidden.svg';
  readonly sidebarToogleIconOpen = 'assets/images/icons/aside-menu-icon-visible.svg';

  constructor() {
    this.feverzoneLogo = this.getPartner()?.brand?.feverzoneLogoHeader ?? this.#defaultFeverzoneLogo;
  }

  getPartner(): Partner | null {
    return this.#partnerService.getPartner();
  }

  getSidebarToggleIcon(): string {
    return this.sidebar?.isActive ? this.sidebarToogleIconOpen : this.sidebarToogleIconClose;
  }

  isOrganizationSelected(): boolean {
    return Boolean(this.#partnerService.getPartner());
  }

  isPatrimonioPartner(): boolean {
    return this.#partnerService.getPartner()?.id === CAPN_ID;
  }

  onFeverZoneLogoClick(): void {
    this.#oboSecondScreenDataService.resetCart();
  }

  onMenuButtonClick(): void {
    this.headerStateService.toggleMenu();
  }

  shouldShowCreateEvent(): boolean {
    return this.#createEventVisibilityService.isAvailable(this.isOneStopShopMode);
  }

  toggleSidebar(): void {
    this.sidebar.toggleFromHeader();
  }
}
