import { Dialog, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  NgZone,
  OnInit,
  signal,
  ViewChild,
  ViewEncapsulation,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { KioskPlanDetail } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';
import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { CustomerType } from '@fz-original/app/shared/models/customer/customer-type.enum';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, defer, Observable, of, throwError } from 'rxjs';
import { map, mergeMap, switchMap } from 'rxjs/operators';

import { DatadogLogLevel } from '../../../../core/error/datadog/logger/datadog-log.service';
import { ScreenTypeaheadInput } from '../../../../core/tracking/core/events/select-option-typeahead';
import { formatLocalDateTime, formatLocalDateWithYear } from '../../../../shared/components/date-selector/date-selector.util';
import { CartSession } from '../../../../shared/models/cart/cart-session.model';
import { Cart } from '../../../../shared/models/cart/cart.model';
import { Customer } from '../../../../shared/models/customer/customer.model';
import { Terms } from '../../../../shared/models/customer/terms.enum';
import { Partner } from '../../../../shared/models/partner/partner.model';
import { FeatureFlags } from '../../../../shared/optimizely/feature-flags';
import { CartService } from '../../../../shared/services/cart/cart.service';
import { DiscardCartQuery } from '../../../../shared/services/cart/discard-cart-query';
import { PrepareCartQuery } from '../../../../shared/services/cart/prepare-cart-query';
import { CustomerService, hasContactDetails } from '../../../../shared/services/customer/customer.service';
import {
  CAIXA_FORUM_PARTNER_ID,
  MERLIN_DEMO_PARTNER_ID,
  MERLIN_PARTNER_ID,
  PartnerService,
} from '../../../../shared/services/partner/partner.service';
import {
  ContactInformationFieldEnum,
  ContactInformationRequirementEnum,
  ContactInformationSetup,
} from '../../../box-office/shared/models/onsite-setup';
import {
  KioskInactivityResetContext,
  kioskInactivityResetMessage,
  KioskRealTimeTimeslot,
} from '../../models/kiosk-real-time-seating.model';
import { IdleService } from '../../services/idle/idle.service';
import { KioskStateService } from '../../services/kiosk-state/kiosk-state.service';
import { KioskStorageService } from '../../services/kiosk-storage.service';
import { KioskService } from '../../services/kiosk.service';
import { KioskScreensaverService } from '../../services/screensaver/kiosk-screensaver.service';
import { ContactComponent, KioskContactFormValue } from '../../shared/components/contact/contact.component';
import { KioskDiscardCartModalComponent } from '../../shared/components/modals/kiosk-discard-cart/kiosk-discard-cart-modal.component';
import { KIOSK_CONTACT_INFORMATION_PHONE_FEATURE } from '../../shared/kiosk-contact-information-phone.feature';
import { KioskNavigationService } from '../../shared/kiosk-navigation.service';
import { isKioskRealTimeCart, toRealTimeTimeslot } from '../../utils/kiosk-real-time-seating.util';
import { checkResponseData } from '../../utils/response';
import { KioskErrorModalComponent } from './../../shared/components/modals/kiosk-error/kiosk-error-modal.component';
import { KioskTermsModalComponent } from './../../shared/components/modals/kiosk-terms/kiosk-terms-modal.component';

const partnerTermsDictionary: Readonly<Record<number, string>> = {
  [CAIXA_FORUM_PARTNER_ID]: `${CAIXA_FORUM_PARTNER_ID}.checkout.termsAndConditions.label`,
};

const partnerCommercialCommunicationsLabelOverrides: Readonly<Record<number, string>> = {
  [CAIXA_FORUM_PARTNER_ID]: `${CAIXA_FORUM_PARTNER_ID}.checkout.commercialCommunications.label`,
};

const partnerContactTermsLabelOverrides: Readonly<Record<number, string>> = {
  [CAIXA_FORUM_PARTNER_ID]: `${CAIXA_FORUM_PARTNER_ID}.checkout.communicationPermissions.label`,
  [MERLIN_PARTNER_ID]: 'kiosk.checkout.contact.acceptTerms.labelWithoutFeverApp',
  [MERLIN_DEMO_PARTNER_ID]: 'kiosk.checkout.contact.acceptTerms.labelWithoutFeverApp',
};

const partnersWithContactTermsModal: ReadonlySet<number> = new Set([CAIXA_FORUM_PARTNER_ID]);

const partnersWithRequiredFullName: ReadonlySet<number> = new Set([CAIXA_FORUM_PARTNER_ID]);

@Component({
  selector: 'app-kiosk-checkout',
  standalone: false,
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class CheckoutComponent implements OnInit {
  static readonly discardCartModalDialogId = 'kiosk-discard-cart-modal';
  readonly #cartService: CartService = inject(CartService);
  #changeDetectorRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  #couponCode: WritableSignal<string> = signal<string>('');
  #customerService: CustomerService = inject(CustomerService);
  readonly #destroyRef = inject(DestroyRef);
  #dialog: Dialog = inject(Dialog);
  readonly #idleService: IdleService = inject(IdleService);
  readonly #kioskNavigationService: KioskNavigationService = inject(KioskNavigationService);
  readonly #kioskScreensaverService = inject(KioskScreensaverService);
  readonly #kioskService: KioskService = inject(KioskService);
  protected readonly uiRefreshEnabled: boolean = this.#kioskScreensaverService.isScreensaverEnabled() === true;
  #kioskStateService: KioskStateService = inject(KioskStateService);
  #kioskStorageService: KioskStorageService = inject(KioskStorageService);
  readonly #ngZone = inject(NgZone);
  readonly #optimizelyService = inject(OptimizelyService);
  #partnerService: PartnerService = inject(PartnerService);
  #route: ActivatedRoute = inject(ActivatedRoute);
  #translateService: TranslateService = inject(TranslateService);
  #userService: UserService = inject(UserService);
  acceptedCommercialCommunications = false;
  acceptedPartnerTerms = false;
  acceptedTerms = true;
  cart: Cart | null = null;
  cartSessions: CartSession[] | null = null;
  @ViewChild(ContactComponent) contactComponent!: ContactComponent;
  contactInformationSetup: ContactInformationSetup = this.#kioskStorageService.getOnsiteSetup()?.contact_information_setup || {
    fields: [ContactInformationFieldEnum.EMAIL],
    requirement_on_current_day: ContactInformationRequirementEnum.OPTIONAL,
  };
  customer: Customer | null = null;
  #contactFieldBlurredInCurrentTap = false;
  #isContactFieldFocused = false;
  #isPointerDown = false;
  readonly isContactInformationPhoneEnabled = inject(OptimizelyService).isFeatureEnabled(KIOSK_CONTACT_INFORMATION_PHONE_FEATURE) === true;
  eventDate: string | null = null;
  eventLocation: string | null = null;
  isLoading$ = new BehaviorSubject<boolean>(true);
  locale = this.#translateService.currentLang;
  partner: Partner | null = null;
  contactTermsLabelOverrideKey = signal<string | null>(null);
  partnerTermsTranslationKey = signal<string | null>(null);
  commercialCommunicationsLabelKey = signal<string | null>(null);
  plan: KioskPlanDetail | null = null;
  screen = ScreenTypeaheadInput;
  selectedCityId!: number;
  showContactForm = true;

  contactTermsLabelKey = computed(() => this.contactTermsLabelOverrideKey() ?? 'kiosk.checkout.contact.acceptTerms.label');

  showPartnerTermsCheckbox = computed(() => {
    return this.partner !== null && this.partnerTermsTranslationKey() !== null;
  });

  showCommercialCommunicationsCheckbox = computed(() => this.commercialCommunicationsLabelKey() !== null);

  disablePrimaryButton(): boolean {
    const hasPartnerTerms = this.showPartnerTermsCheckbox();
    const isCaixaForumPartner = this.partner?.id === CAIXA_FORUM_PARTNER_ID;
    if (!this.showContactForm) {
      return false;
    }
    if (!this.contactComponent?.isFormValid()) {
      return true;
    }
    if (isCaixaForumPartner) {
      return hasPartnerTerms && !this.acceptedPartnerTerms;
    }
    return !this.acceptedTerms || (hasPartnerTerms && !this.acceptedPartnerTerms);
  }

  constructor() {
    this.#trackPointerDuringTap();
  }

  isRealKiosk(): boolean {
    return this.#userService.isKioskUser();
  }

  ngOnInit(): void {
    const { cart, customer }: { cart: Cart | null; customer: Customer | null } = this.#route.snapshot.data.checkoutData;
    const cityIdParam = this.#route.snapshot.queryParamMap.get('cityId');
    if (cityIdParam === null) {
      this.#kioskService.logTrace('cityId query param missing on kiosk checkout', DatadogLogLevel.Error, {
        plan: this.#kioskStorageService.getPlan()?.id,
        url: this.#route.snapshot.url.join('/'),
      });
      throw new Error('cityId query param is required on kiosk checkout');
    }
    this.selectedCityId = Number.parseInt(cityIdParam, 10);
    this.cart = cart;
    this.plan = this.#kioskStorageService.getPlan();
    this.customer = customer !== null && hasContactDetails(customer) ? customer : null;
    this.partner = this.#partnerService.getPartner();
    this.#initializePartnerTerms();
    if (this.cart && this.plan) {
      const firstSession: CartSession | undefined = this.cart.sessionItemsByDatetime.values().next().value?.[0];
      const sessionStartAt = firstSession?.sessionStartAt ?? '';
      const sessionTimezone = firstSession?.sessionTimezone ?? 'UTC';
      this.eventDate = this.#shouldHideSingleSessionStartTime()
        ? formatLocalDateWithYear(sessionStartAt, this.locale, sessionTimezone)
        : formatLocalDateTime(sessionStartAt, this.locale, sessionTimezone);
      this.eventLocation = this.plan.place.name;

      this.showContactForm =
        !this.canSkipContactInformation() ||
        this.contactInformationSetup.requirement_on_current_day !== ContactInformationRequirementEnum.DISABLED;
    }
    this.#idleService
      .get()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#logInactivityReset();
        this.#dialog.closeAll();
        this.#discardCartAndNavigate();
      });
    this.#changeDetectorRef.detectChanges();
    this.isLoading$.next(false);
  }

  onBackClicked(): void {
    this.showWarningDiscardOrderModal();
  }

  onContactFormSubmit(formData: KioskContactFormValue): void {
    if (!formData.email && !formData.phoneNumber) {
      return;
    }
    const isCaixaForumPartner = this.partner?.id === CAIXA_FORUM_PARTNER_ID;
    const acceptedTermsList: Terms[] = [
      Terms.ON_SITE_TERMS_OF_PRIVACY,
      ...(this.acceptedPartnerTerms && isCaixaForumPartner ? [Terms.CAIXA_FORUM_TERMS_OF_PURCHASE] : []),
      ...(this.acceptedCommercialCommunications && isCaixaForumPartner ? [Terms.CAIXA_FORUM_COMMUNICATION_PERMISSIONS] : []),
    ];
    const customerData = {
      email: formData.email,
      firstName: formData.name,
      lastName: formData.lastName,
      acceptedTerms: acceptedTermsList,
      ...(formData.phoneNumber && { phoneNumber: formData.phoneNumber }),
    };
    this.customer = {
      ...customerData,
      cityStandardId: this.selectedCityId,
      type: CustomerType.USER,
    };
  }

  onContactFieldFocusIn(): void {
    this.#isContactFieldFocused = true;
  }

  onContactFieldFocusOut(event: FocusEvent): void {
    const contactElement = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && contactElement.contains(event.relatedTarget)) {
      return;
    }
    this.#isContactFieldFocused = false;
    this.#contactFieldBlurredInCurrentTap = true;
    if (!this.#isPointerDown) {
      this.#clearBlurredInCurrentTapAfterThisTask();
    }
  }

  onContinueClicked(): void {
    if (this.#isTapClosingTheKeyboard()) {
      this.#closeKeyboard();
      return;
    }
    if (this.showContactForm) {
      this.contactComponent.onSubmit();
      if (
        !this.contactComponent.contactInformationForm.valid &&
        this.contactInformationSetup.requirement_on_current_day === ContactInformationRequirementEnum.REQUIRED
      ) {
        return;
      }
    }
    this.isLoading$.next(true);
    this.#idleService.pause();
    this.#prepareCartForCustomer()
      .pipe(
        switchMap(({ cart, customer }: { cart: Cart; customer: Customer }) => {
          if (this.#couponCode().length === 0) {
            return of(cart);
          }
          return this.#cartService
            .applyCouponToCart(
              {
                cartId: cart.id!,
                couponCode: this.#couponCode(),
                partnerId: this.partner!.id!,
                userId: customer.id!,
              },
              false,
            )
            .pipe(map((cartResponse: BaseResponse<Cart | null>) => cartResponse.data!));
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: (error: BaseResponse<unknown> | BaseErrorResponse) => {
          this.isLoading$.next(false);
          if (this.#isRealTimeCart()) {
            this.#idleService.reset();
          }
          const messageKey = this.#getErrorMessage(error);
          this.showErrorModal(messageKey);
        },
        next: (cart: Cart) => {
          this.#kioskNavigationService.navigateBookingQuestions(cart, this.customer!);
        },
      });
  }

  onCouponChange(couponChange: { coupon: Coupon | null }): void {
    const coupon: Coupon | null = couponChange.coupon;
    if (coupon !== null) {
      this.#couponCode.set(coupon.code.trim());
    } else {
      this.#couponCode.set('');
    }
    if (this.cart !== null) {
      const clonedCart: Cart = this.cart.clone();
      clonedCart.appliedCoupon = coupon;
      clonedCart.calculateTotal(coupon ?? undefined);
      this.cart = clonedCart;
      this.#changeDetectorRef.markForCheck();
    }
  }

  onContactTermsLabelClick(event: Event): void {
    if (this.#shouldShowContactTermsModal() && this.#clickedOnOpenTermsModalLink(event)) {
      event.stopPropagation();
      this.#openContactTermsModal();
    }
  }

  #shouldShowContactTermsModal(): boolean {
    return !!this.partner?.id && partnersWithContactTermsModal.has(this.partner.id);
  }

  #clickedOnOpenTermsModalLink(event: Event): boolean {
    const clickedElement = event.target as HTMLElement | null;
    return clickedElement?.closest('.open-terms-modal') != null;
  }

  #openContactTermsModal(): void {
    const partnerId = this.partner!.id;
    this.#dialog.open<boolean>(KioskTermsModalComponent, {
      data: {
        titleKey: `${partnerId}.checkout.communicationPermissions.modal.title`,
        bodyKey: `${partnerId}.checkout.communicationPermissions.modal.body`,
      },
    });
  }

  onCommercialCommunicationsCheckChange(): void {
    this.acceptedCommercialCommunications = !this.acceptedCommercialCommunications;
  }

  onPartnerTermsCheckChange(): void {
    this.acceptedPartnerTerms = !this.acceptedPartnerTerms;
  }

  onPartnerTermsLabelClick(event: Event): void {
    if (this.#shouldShowPartnerTermsModal() && this.#clickedOnOpenTermsModalLink(event)) {
      event.stopPropagation();
      this.#openPartnerTermsModal();
    }
  }

  #shouldShowPartnerTermsModal(): boolean {
    return !!this.partner?.id && !!this.partnerTermsTranslationKey();
  }

  #openPartnerTermsModal(): void {
    const partnerId = this.partner!.id;
    const dialogRef = this.#dialog.open<boolean>(KioskTermsModalComponent, {
      data: {
        titleKey: `${partnerId}.checkout.termsAndConditions.modal.title`,
        bodyKey: `${partnerId}.checkout.termsAndConditions.modal.body`,
      },
    });
    dialogRef.closed.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((accepted: boolean | undefined) => {
      if (accepted && !this.acceptedPartnerTerms) {
        this.acceptedPartnerTerms = true;
        this.#changeDetectorRef.detectChanges();
      }
    });
  }

  onTermsCheckChange() {
    this.acceptedTerms = !this.acceptedTerms;
  }

  protected get requiresFullName(): boolean {
    return !!this.partner?.id && partnersWithRequiredFullName.has(this.partner.id);
  }

  #discardCartAndNavigate(): void {
    if (!this.partner || !this.cart) {
      return;
    }
    const query: DiscardCartQuery = {
      cartId: this.cart.id!, // a cart that reached checkout was created by the API, so it carries an id
      partnerId: this.partner.id,
    };
    this.#cartService
      .discardCart(query)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#kioskNavigationService.navigateHome());
  }

  /** Giving up a real-time cart empties its OneBox basket: the kiosk goes back to that timeslot's seat map, empty. */
  #discardCartAndReturnToSeatMap(): void {
    const { cart, partner, plan } = this;
    const timeslot: KioskRealTimeTimeslot | null = cart === null ? null : toRealTimeTimeslot(cart);
    if (cart?.id === undefined || partner === null || plan === null || timeslot === null) {
      this.#discardCartAndNavigate();
      return;
    }
    this.#cartService
      .discardCart({ cartId: cart.id, partnerId: partner.id })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        complete: () => this.#kioskNavigationService.navigateRealTimeSeatMap(plan, timeslot),
        error: () => this.#kioskNavigationService.navigateRealTimeSeatMap(plan, timeslot),
      });
  }

  #getErrorMessage(error: BaseResponse<unknown> | BaseErrorResponse): string | undefined {
    if ('message' in error) {
      return error.message;
    }
    return error?.error?.message;
  }

  #shouldHideSingleSessionStartTime(): boolean {
    return this.#kioskStateService.state().hideSingleSessionStartTime;
  }

  #initializePartnerTerms(): void {
    if (this.partner?.id && partnerTermsDictionary[this.partner.id]) {
      this.partnerTermsTranslationKey.set(partnerTermsDictionary[this.partner.id]);
    } else {
      this.partnerTermsTranslationKey.set(null);
    }
    if (this.partner?.id && partnerContactTermsLabelOverrides[this.partner.id]) {
      this.contactTermsLabelOverrideKey.set(partnerContactTermsLabelOverrides[this.partner.id]);
    } else {
      this.contactTermsLabelOverrideKey.set(null);
    }
    if (this.partner?.id && partnerCommercialCommunicationsLabelOverrides[this.partner.id]) {
      this.commercialCommunicationsLabelKey.set(partnerCommercialCommunicationsLabelOverrides[this.partner.id]);
    } else {
      this.commercialCommunicationsLabelKey.set(null);
    }
  }

  #isRealTimeCart(): boolean {
    return isKioskRealTimeCart(this.#optimizelyService.isFeatureEnabled(FeatureFlags.KIOSK_STEPPER_FLOW) ?? false, this.plan, this.cart);
  }

  #logInactivityReset(): void {
    const context: KioskInactivityResetContext = {
      cartId: this.cart?.id,
      hasLiveRealTimeBasket: this.#isRealTimeCart(),
      planId: this.plan?.id,
      screen: 'checkout',
    };
    this.#kioskService.logTrace(kioskInactivityResetMessage, DatadogLogLevel.Info, context);
  }

  private canSkipContactInformation(): boolean {
    if (this.cart?.hasSessionsInFuture) {
      return false;
    } else {
      return this.contactInformationSetup.requirement_on_current_day !== ContactInformationRequirementEnum.REQUIRED;
    }
  }

  private createCustomer(): Observable<Customer> {
    return this.#customerService.create(this.partner!.id!, this.customer!).pipe(
      mergeMap(response => checkResponseData(response)),
      map(response => (this.customer = response.data!)),
    );
  }

  #closeKeyboard(): void {
    const activeElement = globalThis.document?.activeElement;
    if (activeElement instanceof HTMLElement && activeElement.closest('app-kiosk-contact') !== null) {
      activeElement.blur();
    }
    this.#isContactFieldFocused = false;
    this.#contactFieldBlurredInCurrentTap = false;
  }

  #clearBlurredInCurrentTapAfterThisTask(): void {
    this.#ngZone.runOutsideAngular(() => setTimeout(() => (this.#contactFieldBlurredInCurrentTap = false)));
  }

  #trackPointerDuringTap(): void {
    const document = globalThis.document;
    if (!this.isContactInformationPhoneEnabled || document === undefined) {
      return;
    }
    const onPointerDown = (): void => {
      this.#isPointerDown = true;
    };
    const onPointerRelease = (): void => {
      this.#isPointerDown = false;
      if (this.#contactFieldBlurredInCurrentTap) {
        this.#clearBlurredInCurrentTapAfterThisTask();
      }
    };
    this.#ngZone.runOutsideAngular(() => {
      document.addEventListener('pointerdown', onPointerDown, true);
      document.addEventListener('pointerup', onPointerRelease, true);
      document.addEventListener('pointercancel', onPointerRelease, true);
    });
    this.#destroyRef.onDestroy(() => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', onPointerRelease, true);
      document.removeEventListener('pointercancel', onPointerRelease, true);
    });
  }

  #isTapClosingTheKeyboard(): boolean {
    if (!this.isContactInformationPhoneEnabled || !this.showContactForm) {
      return false;
    }
    return this.#isContactFieldFocused || this.#contactFieldBlurredInCurrentTap;
  }

  #prepareCartForCustomer(): Observable<{ cart: Cart; customer: Customer }> {
    if (!this.#cartService.canPrepareInOneCall()) {
      return this.createCustomer().pipe(
        switchMap((customer: Customer) => this.prepareCart(customer).pipe(map((cart: Cart) => ({ cart, customer })))),
      );
    }
    return defer(() => {
      const customer: Customer = this.customer ?? {};
      return this.#cartService.prepareAndGetCartForCustomer({ ...this.#getPrepareCartQuery(), customer }).pipe(
        mergeMap((response: BaseResponse<Cart | null>) => (response.data === null ? throwError(() => response) : of(response.data))),
        map((cart: Cart) => {
          const userId = cart.userId ?? undefined;
          this.customer = hasContactDetails(customer) ? { ...customer, id: userId } : { id: userId, type: CustomerType.ANONYMOUS };
          return { cart, customer: this.customer };
        }),
      );
    });
  }

  #getPrepareCartQuery(): Omit<PrepareCartQuery, 'userId'> {
    const { cart, partner, plan } = this;
    if (cart?.id === undefined || partner === null || plan === null) {
      throw new Error('Missing cart, partner or plan for kiosk payment');
    }
    const cartQueryParams: Omit<PrepareCartQuery, 'userId'> = {
      partnerId: partner.id,
      cartId: cart.id,
      planId: plan.id,
      placeId: plan.place.id,
      channel: this.#kioskStorageService.getChannelId(),
    };
    const config = this.#kioskStorageService.getConfiguration();
    const onsiteSetup = this.#kioskStorageService.getOnsiteSetup();
    if (!config?.serial || !onsiteSetup?.id) {
      this.#kioskService.logTrace('Missing KioskOnsiteSetup or KioskConfiguration for kiosk payment', DatadogLogLevel.Error, {
        hasConfig: config !== null,
        hasSerial: Boolean(config?.serial),
        hasOnsiteSetup: onsiteSetup !== null,
        hasOnsiteSetupId: Boolean(onsiteSetup?.id),
      });
      throw new Error('Missing KioskOnsiteSetup or KioskConfiguration for kiosk payment');
    }

    cartQueryParams.kioskSerialNumber = config.serial;
    cartQueryParams.onsiteSetupId = onsiteSetup.id;
    return cartQueryParams;
  }

  private prepareCart(customer: Customer): Observable<Cart> {
    return this.#cartService.prepareAndGetCart({ ...this.#getPrepareCartQuery(), userId: customer.id }).pipe(
      mergeMap(response => checkResponseData(response)),
      map(response => response.data!),
    );
  }

  private showErrorModal(errorMessage?: string): void {
    this.#kioskService.logTrace(`Error in checkout pipe: ${errorMessage}`, DatadogLogLevel.Warn, { cart: this.cart?.id });
    this.#dialog.open(KioskErrorModalComponent, {
      data: {
        title: this.#translateService.instant('common.errorTitle'),
        messages: [this.#translateService.instant(errorMessage ?? 'errors.generic')],
      },
    });
  }

  private showWarningDiscardOrderModal(): void {
    const dialog: DialogRef<boolean, KioskDiscardCartModalComponent> = this.#dialog.open(KioskDiscardCartModalComponent, {
      id: CheckoutComponent.discardCartModalDialogId,
    });

    dialog.closed.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((confirmed: boolean | undefined) => {
      if (confirmed) {
        if (this.#isRealTimeCart()) {
          this.#discardCartAndReturnToSeatMap();
          return;
        }
        this.#discardCartAndNavigate();
      }
    });
  }
}
