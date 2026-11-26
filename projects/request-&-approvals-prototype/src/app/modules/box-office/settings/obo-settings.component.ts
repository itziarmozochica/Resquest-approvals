import {
  AfterContentInit,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  Signal,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, NavigationExtras, Router } from '@angular/router';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { SanitizeService } from '@fz-original/app/app/services/sanitize/sanitize.service';
import type { RetailSetup } from '@fz-shop-products/src/lib/retail/models/retail-setup/retail-setup.model';
import { FzRetailSetupService } from '@fz-shop-products/src/lib/retail/services/retail-setup.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of, Subject, zip } from 'rxjs';
import { catchError, filter, finalize, map, takeUntil, tap } from 'rxjs/operators';

import { CreateOnsiteSetupEvent } from '../../../core/tracking/core/events/create-onsite-setup';
import { DeleteCashRegisterEvent } from '../../../core/tracking/core/events/delete-cash-register';
import { DeleteOnsiteSetupEvent } from '../../../core/tracking/core/events/delete-onsite-setup';
import { DuplicateOnsiteSetupEvent } from '../../../core/tracking/core/events/duplicate-onsite-setup';
import { OpenOnsiteSettingsEvent } from '../../../core/tracking/core/events/open-onsite_settings';
import { ScreenTypeaheadInput } from '../../../core/tracking/core/events/select-option-typeahead';
import { UpdateCashRegisterEvent } from '../../../core/tracking/core/events/update-cash-register';
import { UpdateOnsiteSetupEvent } from '../../../core/tracking/core/events/update-onsite-setup';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { MessageModalComponent } from '../../../shared/components/message-modal/message-modal.component';
import { SelectOption } from '../../../shared/layout/filters/select/select.interface';
import { Partner } from '../../../shared/models/partner/partner.model';
import { FeatureFlags } from '../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../shared/optimizely/optimizely.service';
import { SearchBarFilter } from '../../../shared/search-bar/enums/search-bar-filter.enum';
import { SearchFilter } from '../../../shared/search-bar/models/search-filter.model';
import { SearchBarService } from '../../../shared/search-bar/service/search-bar.service';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { Channel } from '../../../shared/services/session-availability/channel.enum';
import { ToastService, type Toast } from '../../../shared/services/toast/toast.service';
import { Permissions } from '../../../shared/services/user/permissions';
import { UserService } from '../../../shared/services/user/user.service';
import { TabOptionWithContent } from '../../sessions/shared/models/tab-option-with-content.model';
import { AccessControlService } from '../../validation/services/access-control/access-control.service';
import { DialogEditCustomTabMode } from '../custom-tabs/models/edit-custom-tab-info.model';
import { CashRegister } from '../shared/models/cash-register';
import { OnsiteSetup } from '../shared/models/onsite-setup';
import { CashRegistersService } from '../shared/services/cash-registers/cash-registers.service';
import { OnsiteSetupsPresetCouponsService } from '../shared/services/onsite-setups-preset-coupons/onsite-setups-preset-coupons.service';
import { OnsiteSetupsStorageService } from '../shared/services/onsite-setups/onsite-setups-storage.service';
import { OnsiteSetupsService } from '../shared/services/onsite-setups/onsite-setups.service';
import { EDIT_ONSITE_SETUP_QUERY_PARAM, parseEditOnsiteSetupParam } from '../shared/utils/edit-onsite-setup-param.util';
import { BoxOfficeOnsiteSetupForm } from './components/onsite-setup-form/onsite-setup-form.model';
import { OboSettingsTabId } from './models/obo-settings-tab-id.enum';
import { OnsiteSetupSalesChannelService } from './services/onsite-setup-sales-channel.service';
import { createCashRegister } from './tracking/events/create-cash-register.event';
import { resolvePaymentConfigurationErrorMessage } from './utils/payment-configuration-error-message.util';

export enum State {
  noFiltersSelected = 'noFilterSelected',
  loading = 'loading',
  noResults = 'noResults',
  withResults = 'withResults',
  error = 'error',
}

export enum OnsiteSettingAction {
  createCashRegister = 'createCashRegister',
  createSetup = 'createSetup',
  duplicateSetup = 'duplicateSetup',
  editSetup = 'editSetup',
  editCashRegister = 'editCashRegister',
  deleteSetup = 'deleteSetup',
  deleteCashRegister = 'deleteCashRegister',
}

@Component({
  providers: [OnsiteSetupSalesChannelService],
  selector: 'app-obo-settings',
  standalone: false,
  styleUrl: './obo-settings.component.scss',
  templateUrl: './obo-settings.component.html',
})
export class OboSettingsComponent implements AfterContentInit, OnDestroy {
  readonly #accessControlService = inject(AccessControlService);
  readonly #activatedRoute = inject(ActivatedRoute);
  readonly #breakpointStateService = inject(BreakpointStateService);
  readonly #cashRegistersService = inject(CashRegistersService);
  readonly #changeDetectorRef = inject(ChangeDetectorRef);
  readonly #destroy$ = new Subject<void>();
  readonly #fzTracking = inject(FzTrackingService);
  readonly #modalService = inject(NgbModal);
  readonly #onsiteSetupsPresetCouponsService = inject(OnsiteSetupsPresetCouponsService);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #onsiteSetupsService = inject(OnsiteSetupsService);
  readonly #optimizelyService = inject(OptimizelyService);
  #partner: Partner | null = null;
  readonly #partnerService = inject(PartnerService);
  readonly #fzRetailSetupService = inject(FzRetailSetupService);
  readonly #router = inject(Router);
  readonly #sanitizeService = inject(SanitizeService);
  readonly #searchBarService = inject(SearchBarService);
  readonly salesChannelService = inject(OnsiteSetupSalesChannelService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);
  readonly #trackingService = inject(TrackingService);
  readonly #userService = inject(UserService);

  readonly #deeplinkedOnsiteSetupId = toSignal(
    this.#activatedRoute.queryParamMap.pipe(map(params => parseEditOnsiteSetupParam(params.get(EDIT_ONSITE_SETUP_QUERY_PARAM)))),
    { initialValue: null },
  );
  #hasEditOnsiteSetupQueryParam = false;
  readonly #loadedOnsiteSetups = signal<OnsiteSetup[] | null>(null);
  readonly #editorRouteActive = signal(this.#activatedRoute.children.length > 0);

  editorRouteActive = this.#activatedRoute.children.length > 0;
  mandatoryFilters: Array<SearchBarFilter> = [SearchBarFilter.city, SearchBarFilter.place];
  screen = ScreenTypeaheadInput;
  tabs: Array<TabOptionWithContent> = [];
  selectedTab: TabOptionWithContent | null = null;
  /** Mirrors `selectedTab` for `ignt-tabs`; a plain field like it, because the deeplink effect selects a tab. */
  selectedTabIndex = 0;
  protected readonly tabIds = OboSettingsTabId;
  stateEnum = State;
  actionsEnum = OnsiteSettingAction;
  currentStateOnsiteSetup = State.noFiltersSelected;
  currentStateCashRegister = State.noFiltersSelected;
  /** The three tab labels drawn as skeleton bars while the venue's setups load for the first time; on a phone they wrap to two lines. */
  protected readonly skeletonTabWidths = computed<readonly string[]>(() =>
    this.isMobile() ? ['72px', '56px', '96px'] : ['142px', '112px', '192px'],
  );
  /** Skeleton rows drawn where the setup and cash register cards land while they load. */
  protected readonly skeletonRows: readonly number[] = [1, 2, 3];
  /** The height of an `app-onsite-setup-card` and of an `app-cash-register-card` row. */
  protected readonly skeletonRowHeight = 70;
  #hasLoadedVenue = false;
  currentAction: OnsiteSettingAction | null = null;
  actionForm: TemplateRef<unknown> | null = null;
  #previousTabId: string | null = null;
  setupsList: Array<OnsiteSetup> = [];
  activeOnsiteSetupId: string | null = null;
  cashRegisterList: Array<CashRegister> = [];
  isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  isTablet: Signal<boolean> = this.#breakpointStateService.getStateProp('isTablet');
  retailSetupsList: RetailSetup[] = [];
  validationProfilesOptions: SelectOption[] = [];
  accessControlSetupsOptions: SelectOption[] = [];
  readonly #showLateralSlider = signal(false);
  /**
   * The tabs and the setup cards stay a skeleton until the venue's setups first land behind the Box Office setups tab.
   * The other tabs, and later reloads, keep the tab row and draw their own skeleton.
   */
  protected get showsPageSkeleton(): boolean {
    return (
      !this.#hasLoadedVenue &&
      this.currentStateOnsiteSetup === State.loading &&
      (this.selectedTab === null || this.selectedTab.id === OboSettingsTabId.OnsiteSetup)
    );
  }
  get showLateralSlider(): boolean {
    return this.#showLateralSlider();
  }
  set showLateralSlider(value: boolean) {
    this.#showLateralSlider.set(value);
  }
  onsiteSetupSelected: OnsiteSetup | null = null;
  cashRegisterSelected: CashRegister | null = null;
  selectedPlace: SelectOption | null = null;
  protected readonly overrideCapacityEnabled = computed(
    () => this.#showLateralSlider() && (this.#optimizelyService.isFeatureEnabled(FeatureFlags.OVERRIDE_CAPACITY_FEATURE) ?? false),
  );
  protected readonly appearanceConfigEnabled = computed(
    () => this.#showLateralSlider() && (this.#optimizelyService.isFeatureEnabled(FeatureFlags.ONSITE_APPEARANCE_CONFIG) ?? false),
  );
  protected readonly canViewBrandingConfig = computed(
    () => this.#showLateralSlider() && this.#userService.hasPermission(Permissions.CAN_VIEW_BRANDING_CONFIG),
  );

  @ViewChild('onsiteSetupSearch', { static: true }) onsiteSetupSearch!: TemplateRef<unknown>;
  @ViewChild('cashRegisterSearch', { static: true }) cashRegisterSearch!: TemplateRef<unknown>;
  @ViewChild('paymentConfigurationsContent', { static: true }) paymentConfigurationsContent!: TemplateRef<unknown>;
  @ViewChild('onsiteSetupForm', { static: true }) onsiteSetupForm!: TemplateRef<unknown>;
  @ViewChild('cashRegisterForm', { static: true }) cashRegisterForm!: TemplateRef<unknown>;

  constructor() {
    this.#syncOptimizelyPartnerId();
    this.#trackingService.track(new OpenOnsiteSettingsEvent());
    this.#openDeeplinkedOnsiteSetupForm();
  }

  goToCustomTabsSettings(setup: OnsiteSetup, isCreating: boolean): void {
    const { cityId, venueId } = this.#activatedRoute.snapshot.queryParams;
    this.#router.navigate(['/box-office/settings', setup.id, 'custom-tabs'], {
      queryParams: {
        cityId,
        venueId,
        ...(isCreating ? { dialogInfoMode: DialogEditCustomTabMode.CREATE, openedDialogInfo: true } : {}),
      },
      queryParamsHandling: 'merge',
    });
  }

  ngAfterContentInit(): void {
    this.tabs = this.#getTabs();
    this.#selectTab(this.tabs[0]);
    this.#activatedRoute.queryParamMap.pipe(takeUntil(this.#destroy$)).subscribe(params => {
      const tab = this.tabs.find(option => option.id === params.get('tab'));
      if (tab) {
        this.#selectTab(tab);
      }
      const activeTabId = this.selectedTab?.id ?? null;
      if (activeTabId === OboSettingsTabId.OnsiteSetup && activeTabId !== this.#previousTabId && this.#previousTabId !== null) {
        this.#loadOnsiteSetups();
      }
      this.#previousTabId = activeTabId;
    });
    this.#router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.#destroy$),
      )
      .subscribe(() => {
        this.editorRouteActive = this.#activatedRoute.children.length > 0;
        this.#editorRouteActive.set(this.editorRouteActive);
      });
    this.#changeDetectorRef.detectChanges();
  }

  showTabContent(optionTab: TabOptionWithContent): void {
    this.#selectTab(optionTab);
    this.#router.navigate([], {
      queryParams: { tab: optionTab.id },
      queryParamsHandling: 'merge',
      relativeTo: this.#activatedRoute,
      replaceUrl: true,
    });
  }

  protected onTabIndexChange(index: number): void {
    const tab = this.tabs[index];
    if (tab) {
      this.showTabContent(tab);
    }
  }

  protected createPaymentConfiguration(): void {
    void this.#router.navigate(['payment-configurations', 'new'], { queryParamsHandling: 'preserve', relativeTo: this.#activatedRoute });
  }

  #selectTab(tab: TabOptionWithContent): void {
    this.selectedTab = tab;
    this.selectedTabIndex = this.tabs.indexOf(tab);
  }

  #getTabs(): Array<TabOptionWithContent> {
    const onsiteSetupTab: TabOptionWithContent = {
      id: OboSettingsTabId.OnsiteSetup,
      label: 'boxOffice.settings.label',
      content: this.onsiteSetupSearch,
    };
    const cashRegisterTab: TabOptionWithContent = {
      id: OboSettingsTabId.CashRegister,
      label: 'boxOffice.settings.cashRegisterLabel',
      content: this.cashRegisterSearch,
    };
    const paymentConfigurationsTab: TabOptionWithContent = {
      id: OboSettingsTabId.PaymentConfigurations,
      label: 'boxOffice.settings.paymentConfigurationsLabel',
      content: this.paymentConfigurationsContent,
    };
    return [onsiteSetupTab, cashRegisterTab, paymentConfigurationsTab];
  }

  ngOnDestroy(): void {
    this.#destroy$.next();
  }

  loadNewSearch(filters: SearchFilter): void {
    this.#partner = filters.partner;
    this.selectedPlace = filters.selectedPlace ?? null;
    this.#hasLoadedVenue = false;
    this.salesChannelService.setPartnerId(this.#partner?.id ?? null);
    if (this.#partner?.id) {
      this.salesChannelService.loadPartnerChannels(this.#partner.id);
    }
    this.#loadOnsiteSetups();
    this.#loadAccessControlSetupsAndProfiles();
  }

  onCashRegisterCreatedFromSetup(cashRegister: Pick<CashRegister, 'id'> & { placeId: number }): void {
    this.#fzTracking.track(createCashRegister({ cashRegisterId: cashRegister.id, placeId: cashRegister.placeId }));
    this.#refreshCashRegistersList();
  }

  #updateCurrentStates(stateOnsiteSetup: State, stateCashRegister?: State): void {
    this.currentStateOnsiteSetup = stateOnsiteSetup;
    this.currentStateCashRegister = stateCashRegister ? stateCashRegister : stateOnsiteSetup;
  }

  #refreshCashRegistersList(): void {
    const placeId = this.selectedPlace?.id;
    if (placeId == null || !this.#partner?.id) {
      return;
    }
    this.#cashRegistersService
      .getCashRegisters(undefined, placeId)
      .pipe(takeUntil(this.#destroy$))
      .subscribe({
        next: (cashRegisters: CashRegister[]) => {
          this.cashRegisterList = cashRegisters;
          this.currentStateCashRegister = cashRegisters.length > 0 ? State.withResults : State.noResults;
          this.#changeDetectorRef.detectChanges();
        },
        error: (error: { code: string; message: string }) => {
          this.#showErrorModal(error);
        },
      });
  }

  #loadOnsiteSetups(onsiteSetupCachedIdToBeUpdated: string | null = null): void {
    this.#loadedOnsiteSetups.set(null);
    if (!this.selectedPlace || !this.#partner?.id) {
      this.#updateCurrentStates(State.noFiltersSelected);
      this.setupsList = [];
      return;
    }
    this.#updateCurrentStates(State.loading);

    zip(
      this.#onsiteSetupsService.getOnsiteSetups({ placeId: this.selectedPlace.id }),
      this.#cashRegistersService.getCashRegisters(undefined, this.selectedPlace?.id),
      this.#searchBarService.getSearchBarOptions(this.#partner.id, Channel.BoxOffice),
      this.#fzRetailSetupService.getRetailSetups().pipe(catchError(() => of([]))),
    )
      .pipe(takeUntil(this.#destroy$))
      .subscribe(
        ([onsiteSetups, cashRegisters, plans, retailSetups]) => {
          this.setupsList = onsiteSetups;
          this.activeOnsiteSetupId = this.#onsiteSetupsStorageService.getConfiguration()?.id ?? null;
          this.cashRegisterList = cashRegisters;
          if (!this.#isOnsiteSetupFormOpen()) {
            this.salesChannelService.setPlans(plans.data?.plans || []);
          }
          this.retailSetupsList = retailSetups ?? [];
          this.currentStateOnsiteSetup = this.setupsList.length > 0 ? State.withResults : State.noResults;
          this.currentStateCashRegister = this.cashRegisterList.length > 0 ? State.withResults : State.noResults;
          this.#updateOnsiteSetupStorageAndSearchBarPlansIfExists(this.setupsList, onsiteSetupCachedIdToBeUpdated);
          this.#loadedOnsiteSetups.set(onsiteSetups);
          this.#hasLoadedVenue = true;
        },
        () => {
          this.#hasLoadedVenue = true;
          this.#updateCurrentStates(State.error);
        },
      );
  }

  showForm(action: OnsiteSettingAction, elementSelected?: OnsiteSetup | CashRegister): void {
    this.showLateralSlider = true;
    this.currentAction = action;
    switch (action) {
      case OnsiteSettingAction.createCashRegister:
        this.actionForm = this.cashRegisterForm;
        this.cashRegisterSelected = elementSelected as CashRegister;
        break;
      case OnsiteSettingAction.createSetup:
        this.actionForm = this.onsiteSetupForm;
        this.onsiteSetupSelected = elementSelected as OnsiteSetup;
        this.loadPlansForSalesChannel(Channel.BoxOffice);
        break;
      case OnsiteSettingAction.editSetup:
        this.actionForm = this.onsiteSetupForm;
        this.onsiteSetupSelected = elementSelected as OnsiteSetup;
        this.loadPlansForSalesChannel(this.#resolveBoxOfficeChannelId(this.onsiteSetupSelected));
        this.#setEditOnsiteSetupQueryParam(this.onsiteSetupSelected.id);
        break;
      case OnsiteSettingAction.editCashRegister:
        this.actionForm = this.cashRegisterForm;
        this.cashRegisterSelected = elementSelected as CashRegister;
        break;
    }
  }

  executeAction(formValue: BoxOfficeOnsiteSetupForm): void {
    if (this.#hasEditOnsiteSetupQueryParam) {
      this.#setEditOnsiteSetupQueryParam(null);
    }
    this.showLateralSlider = false;
    this.actionForm = null;
    const placeId = this.selectedPlace?.id;
    let request!: Observable<unknown>;
    const previousStateOnsiteSetup = this.currentStateOnsiteSetup;
    const previousStateCashRegister = this.currentStateCashRegister;
    switch (this.currentAction) {
      case OnsiteSettingAction.createCashRegister:
        this.currentStateCashRegister = State.loading;
        request = this.#cashRegistersService.createCashRegister(placeId, formValue.cashRegisterName!).pipe(
          tap((cashRegisterId: string) => {
            this.#fzTracking.track(createCashRegister({ cashRegisterId, placeId }));
          }),
        );
        break;
      case OnsiteSettingAction.editCashRegister:
        this.currentStateCashRegister = State.loading;
        request = this.#cashRegistersService.updateCashRegister(placeId, this.cashRegisterSelected!.id, formValue.cashRegisterName!).pipe(
          tap(() => {
            const event = new UpdateCashRegisterEvent({ place_id: placeId, cash_register_id: this.cashRegisterSelected!.id });
            this.#trackingService.track(event);
          }),
        );
        break;
      case OnsiteSettingAction.createSetup:
        this.currentStateOnsiteSetup = State.loading;
        request = this.#onsiteSetupsService
          .createBoxOfficeOnsiteSetup(
            placeId,
            formValue.name!,
            formValue.cashRegisters,
            formValue.onlyTicketsForToday!,
            formValue.shiftsMandatory,
            formValue.oboFlowType,
            formValue.paperType,
            formValue.cutterType,
            formValue.priceViewer,
            formValue.showSoldOutSessions,
            formValue.autovalidateTickets,
            formValue.enablePrintTicketsCombinedForPlans ? formValue.printTicketsCombinedForPlans : [],
            formValue.enableShiftMaxHoursOpen ? formValue.shiftMaxHoursOpen : 0,
            formValue.oboPrinterType,
            formValue.prioritizedMainPlans,
            formValue.presetCouponCodes,
            formValue.retailSetupId,
            formValue.warehouseId,
            formValue.productsHolderPlanId,
            formValue.validationProfiles,
            formValue.accessControlSetupId,
            formValue.contactInformationRequirement,
            formValue.contactInformationFields,
            formValue.canOverrideCapacities,
            formValue.receiptPrinterType,
            formValue.channelId,
            formValue.printConfigurationBundleId,
            formValue.paymentConfigurationAssignment,
            formValue.sessionAvailabilityCacheStrategy,
            formValue.sessionAvailabilityCacheTimeoutInSeconds,
            formValue.sessionAvailabilityPlanConfigs,
            formValue.isHidden,
            formValue.hardwareType,
            formValue.ticketSelectorType,
            formValue.contactInformationFieldsOrder,
          )
          .pipe(
            tap((onsite_setup_id: string) => {
              const event = new CreateOnsiteSetupEvent({ place_id: placeId, onsite_setup_id: onsite_setup_id });
              this.#trackingService.track(event);
            }),
          );
        break;
      case OnsiteSettingAction.editSetup:
        this.currentStateOnsiteSetup = State.loading;
        request = this.#onsiteSetupsService
          .updateBoxOfficeOnsiteSetup(
            placeId,
            this.onsiteSetupSelected!.id,
            formValue.name!,
            formValue.cashRegisters!,
            formValue.onlyTicketsForToday!,
            formValue.shiftsMandatory,
            formValue.oboFlowType,
            formValue.paperType,
            formValue.cutterType,
            formValue.priceViewer,
            formValue.showSoldOutSessions,
            formValue.autovalidateTickets,
            formValue.enablePrintTicketsCombinedForPlans ? formValue.printTicketsCombinedForPlans : [],
            formValue.enableShiftMaxHoursOpen ? formValue.shiftMaxHoursOpen : 0,
            formValue.oboPrinterType,
            formValue.prioritizedMainPlans,
            formValue.presetCouponCodes,
            formValue.retailSetupId,
            formValue.warehouseId,
            formValue.productsHolderPlanId,
            formValue.validationProfiles,
            formValue.accessControlSetupId,
            formValue.contactInformationRequirement,
            formValue.contactInformationFields,
            formValue.canOverrideCapacities,
            formValue.receiptPrinterType,
            formValue.channelId,
            formValue.printConfigurationBundleId,
            formValue.paymentConfigurationAssignment,
            formValue.sessionAvailabilityCacheStrategy,
            formValue.sessionAvailabilityCacheTimeoutInSeconds,
            formValue.sessionAvailabilityPlanConfigs,
            formValue.isHidden,
            formValue.hardwareType,
            formValue.ticketSelectorType,
            formValue.contactInformationFieldsOrder,
          )
          .pipe(
            tap(() => {
              this.#onsiteSetupsPresetCouponsService.clearCache(this.onsiteSetupSelected!.id);
              const event = new UpdateOnsiteSetupEvent({ place_id: placeId, onsite_setup_id: this.onsiteSetupSelected!.id });
              this.#trackingService.track(event);
            }),
          );
        break;
    }
    request
      .pipe(
        finalize(() => {
          this.cashRegisterSelected = null;
          this.onsiteSetupSelected = null;
        }),
        takeUntil(this.#destroy$),
      )
      .subscribe(
        () => {
          const isEditSetupCurrentAction = this.currentAction === OnsiteSettingAction.editSetup;
          this.#loadOnsiteSetups(isEditSetupCurrentAction ? this.onsiteSetupSelected!.id : null);
        },
        error => {
          this.#showErrorModal(error);
          this.#updateCurrentStates(previousStateOnsiteSetup, previousStateCashRegister);
        },
      );
  }

  showDeleteModal(action: OnsiteSettingAction, data: CashRegister | OnsiteSetup): void {
    const modal = this.#createDeleteModal(action, data.name);
    modal.componentInstance.responseEmitter
      .pipe(
        finalize(() => {
          this.cashRegisterSelected = null;
          this.onsiteSetupSelected = null;
        }),
        takeUntil(this.#destroy$),
      )
      .subscribe((response: unknown) => (response ? this.#executeDelete(action, data) : null));
  }

  showDuplicateModal(setup: OnsiteSetup): void {
    const modal = this.#createDuplicateModal(setup);
    modal.componentInstance.responseEmitter
      .pipe(takeUntil(this.#destroy$))
      .subscribe((response: unknown) => (response ? this.#executeDuplicate(setup) : null));
  }

  #createDeleteModal(action: OnsiteSettingAction, resourceToDeleteName: string): NgbModalRef {
    const modal = this.#modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.#translateService.instant(`boxOffice.settings.actions.${action}.title`);
    modal.componentInstance.messages = [
      this.#translateService.instant(`boxOffice.settings.actions.${action}.message`, {
        name: this.#sanitizeService.escapeHtml(resourceToDeleteName),
      }),
    ];
    modal.componentInstance.acceptButtonLabel = this.#translateService.instant('common.delete');
    modal.componentInstance.cancelButtonLabel = this.#translateService.instant('common.cancel');
    modal.componentInstance.showDangerAcceptButton = true;
    return modal;
  }

  #createDuplicateModal(setup: OnsiteSetup): NgbModalRef {
    const modal = this.#modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.#translateService.instant('boxOffice.settings.actions.duplicateSetup.title');
    modal.componentInstance.messages = [
      this.#translateService.instant('boxOffice.settings.actions.duplicateSetup.message', {
        name: this.#sanitizeService.escapeHtml(setup.name),
      }),
    ];
    modal.componentInstance.acceptButtonLabel = this.#translateService.instant('common.duplicate');
    modal.componentInstance.cancelButtonLabel = this.#translateService.instant('common.cancel');
    return modal;
  }

  #executeDelete(action: OnsiteSettingAction, data: CashRegister | OnsiteSetup): void {
    let request!: Observable<unknown>;
    const placeId = this.selectedPlace!.id;
    const previousStateOnsiteSetup = this.currentStateOnsiteSetup;
    const previousStateCashRegister = this.currentStateCashRegister;
    switch (action) {
      case OnsiteSettingAction.deleteSetup:
        request = this.#onsiteSetupsService.deleteOnsiteSetup(placeId, data.id).pipe(
          tap(() => {
            this.#onsiteSetupsPresetCouponsService.clearCache(data.id);
            const event = new DeleteOnsiteSetupEvent({ place_id: placeId, onsite_setup_id: data.id });
            this.#trackingService.track(event);
          }),
        );
        this.currentStateOnsiteSetup = State.loading;
        break;
      case OnsiteSettingAction.deleteCashRegister:
        request = this.#cashRegistersService.deleteCashRegister(placeId, data.id).pipe(
          tap(() => {
            const event = new DeleteCashRegisterEvent({ place_id: placeId, cash_register_id: data.id });
            this.#trackingService.track(event);
          }),
        );
        this.currentStateCashRegister = State.loading;
        break;
    }
    request.pipe(takeUntil(this.#destroy$)).subscribe(
      () => {
        this.#loadOnsiteSetups();
      },
      error => {
        this.#showErrorModal(error);
        this.#updateCurrentStates(previousStateOnsiteSetup, previousStateCashRegister);
      },
    );
  }

  #executeDuplicate(setup: OnsiteSetup): void {
    const placeId = this.selectedPlace!.id;
    const previousState = this.currentStateOnsiteSetup;
    this.currentStateOnsiteSetup = State.loading;

    this.#onsiteSetupsService
      .duplicateOnsiteSetup(placeId, setup.id)
      .pipe(
        tap((newOnsiteSetupId: string) => {
          const event = new DuplicateOnsiteSetupEvent({
            place_id: placeId,
            onsite_setup_id: setup.id,
            new_onsite_setup_id: newOnsiteSetupId,
          });
          this.#trackingService.track(event);
        }),
        takeUntil(this.#destroy$),
      )
      .subscribe({
        next: (newOnsiteSetupId: string) => {
          this.#loadOnsiteSetups(newOnsiteSetupId);
          this.#toastService.add({
            message: this.#translateService.instant('boxOffice.settings.actions.duplicateSetup.success'),
            sentiment: 'positive' as Toast['sentiment'],
          });
        },
        error: error => {
          this.#showErrorModal(error);
          this.currentStateOnsiteSetup = previousState;
        },
      });
  }

  openSetupInBoxOffice(setup: OnsiteSetup): void {
    const navigationExtras: NavigationExtras = {
      queryParams: {
        onsiteSetupId: setup.id,
        venueId: setup.place?.id ?? setup.place_id ?? this.selectedPlace?.id ?? null,
      },
      queryParamsHandling: 'merge',
    };

    this.#router.navigate(['/box-office'], navigationExtras);
  }

  goToPaymentConfigurationsTab(): void {
    const paymentConfigurationsTab = this.tabs.find(tab => tab.id === OboSettingsTabId.PaymentConfigurations);
    if (!paymentConfigurationsTab) {
      return;
    }
    this.closeMenuLateral();
    this.showTabContent(paymentConfigurationsTab);
  }

  closeMenuLateral(): void {
    if (this.#hasEditOnsiteSetupQueryParam) {
      this.#setEditOnsiteSetupQueryParam(null);
    }
    this.showLateralSlider = false;
    this.actionForm = null;
    this.onsiteSetupSelected = null;
    this.cashRegisterSelected = null;
  }

  #showErrorModal(error: { code: string; message: string }): void {
    const modal = this.#modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.#translateService.instant('common.errorTitle');
    modal.componentInstance.messages = [
      resolvePaymentConfigurationErrorMessage(this.#translateService, error.code, error.message ?? 'errors.generic'),
    ];
  }

  #loadAccessControlSetupsAndProfiles(): void {
    if (!this.#partner?.id) {
      this.validationProfilesOptions = [];
      this.accessControlSetupsOptions = [];
      return;
    }

    this.#accessControlService.getAllProfiles(this.#partner.id).subscribe({
      next: response => {
        if (response.error || !response.setupsWithProfiles || response.setupsWithProfiles.length === 0) {
          this.validationProfilesOptions = [];
          this.accessControlSetupsOptions = [];
          return;
        }

        this.accessControlSetupsOptions = response.setupsWithProfiles.map(setupWithProfiles => ({
          id: setupWithProfiles.setup.id,
          title: setupWithProfiles.setup.name,
        }));

        this.validationProfilesOptions = response.setupsWithProfiles.flatMap(setupWithProfiles =>
          setupWithProfiles.profiles.map(profile => ({
            id: profile.id,
            title: profile.name,
            setupId: setupWithProfiles.setup.id,
          })),
        );
      },
      error: () => {
        this.validationProfilesOptions = [];
        this.accessControlSetupsOptions = [];
      },
    });
  }

  loadPlansForSalesChannel(channelId: string): void {
    this.salesChannelService.loadPlansForChannel(channelId);
  }

  #resolveBoxOfficeChannelId(onsiteSetup: OnsiteSetup | null): string {
    return onsiteSetup?.channel_id ?? Channel.BoxOffice;
  }

  #isOnsiteSetupFormOpen(): boolean {
    return (
      this.showLateralSlider &&
      (this.currentAction === OnsiteSettingAction.createSetup || this.currentAction === OnsiteSettingAction.editSetup)
    );
  }

  #openDeeplinkedOnsiteSetupForm(): void {
    effect(() => {
      const onsiteSetupId = this.#deeplinkedOnsiteSetupId();
      const onsiteSetups = this.#loadedOnsiteSetups();

      if (onsiteSetupId === null) {
        this.#closeDeeplinkedOnsiteSetupForm();
        return;
      }

      if (this.#editorRouteActive() || this.showLateralSlider || onsiteSetups === null) {
        return;
      }

      const onsiteSetup = onsiteSetups.find(candidate => candidate.id === onsiteSetupId) ?? null;
      if (onsiteSetup === null) {
        // The id does not belong to the loaded listing (deleted or from another place).
        this.#setEditOnsiteSetupQueryParam(null);
        return;
      }

      if (this.selectedTab?.id !== OboSettingsTabId.OnsiteSetup) {
        const onsiteSetupTab = this.tabs.find(tab => tab.id === OboSettingsTabId.OnsiteSetup);
        if (onsiteSetupTab) {
          this.showTabContent(onsiteSetupTab);
        }
      }
      this.showForm(OnsiteSettingAction.editSetup, onsiteSetup);
    });
  }

  #closeDeeplinkedOnsiteSetupForm(): void {
    if (!this.#hasEditOnsiteSetupQueryParam || !this.#isOnsiteSetupFormOpen()) {
      return;
    }
    this.#hasEditOnsiteSetupQueryParam = false;
    this.closeMenuLateral();
  }

  #setEditOnsiteSetupQueryParam(onsiteSetupId: string | null): void {
    this.#hasEditOnsiteSetupQueryParam = onsiteSetupId !== null;
    void this.#router.navigate([], {
      relativeTo: this.#activatedRoute,
      queryParams: { [EDIT_ONSITE_SETUP_QUERY_PARAM]: onsiteSetupId },
      queryParamsHandling: 'merge',
    });
  }

  #syncOptimizelyPartnerId(): void {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId && !this.#optimizelyService.getPartnerId()) {
      this.#optimizelyService.setPartnerId(partnerId.toString());
    }
  }

  #updateOnsiteSetupStorageAndSearchBarPlansIfExists(onsiteSetups: OnsiteSetup[], onsiteSetupSelectedId: string | null = null): void {
    const onsiteSetupStorage = this.#onsiteSetupsStorageService.getConfiguration();
    if (!onsiteSetupSelectedId || onsiteSetupSelectedId !== onsiteSetupStorage?.id) {
      return;
    }

    const activeOnsiteSetup = onsiteSetups.find(onsiteSetup => onsiteSetup.id === onsiteSetupSelectedId);
    if (!activeOnsiteSetup) {
      return;
    }

    this.#onsiteSetupsStorageService.setConfiguration({
      ...activeOnsiteSetup,
      place_id: activeOnsiteSetup.place?.id ?? activeOnsiteSetup.place_id ?? onsiteSetupStorage.place?.id ?? onsiteSetupStorage.place_id,
      ...(onsiteSetupStorage.user_id && { user_id: onsiteSetupStorage.user_id }),
    });
  }
}
