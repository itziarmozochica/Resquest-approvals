import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { fadeAnimation } from '@fz-original/app/shared/animations/fade.animation';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { fromEvent } from 'rxjs';
import { filter, startWith } from 'rxjs/operators';

import { SliderItem } from '../../../../shared/components/sliders/ken-burns-slider/ken-burns-slider.component';
import { Partner } from '../../../../shared/models/partner/partner.model';
import { SeatingProviderEnum } from '../../../../shared/seating-selector/components/seating-selector/__data__/seating-provider.enum';
import { MainScreenBusyService } from '../../../../shared/services/dual-screen/main-screen-busy.service';
import { DEFAULT_PARTNER_LOGO } from '../../../../shared/services/partner/partner-logo.constants';
import { PartnerLogoService } from '../../../../shared/services/partner/partner-logo.service';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { SecondScreenConfiguration } from '../../shared/models/second-screen-configuration';
import { Shift } from '../../shared/models/shifts.model';
import { UserShiftStorageService } from '../../ticketing/services/user-shift/user-shift-storage.service';
import { OboSecondScreenCart } from '../models/obo-second-screen-cart.model';
import { OboSecondScreenData } from '../models/obo-second-screen-data.model';
import { OboSecondScreenPartnerState } from '../models/obo-second-screen-partner.state';
import { OboSecondScreenPlan } from '../models/obo-second-screen-plan.model';
import { OboSecondScreenStoredSeatingMap } from '../models/seating-map/obo-second-screen-seating-map.model';
import { SecondScreenLoggedOutBannerStorageService } from '../services/logged-out-banner/second-screen-logged-out-banner-storage.service';
import { OboSecondScreenDataService } from '../services/obo-second-screen-data.service';
import { OboSecondScreenStorageService } from '../services/obo-second-screen-storage.service';
import { SecondScreenConfigurationStorageService } from '../services/second-screen-configuration/second-screen-configuration-storage.service';
import { resolvePartnerStandbyItems, resolvePartnerState } from '../utils/banner-card-partner.util';
import { toFilledValue, toStandbySliderItems } from '../utils/second-screen-configuration.util';
import { upscaleCloudinaryImageUrl } from '../utils/upscale-cloudinary-image-url.util';
import { BannerCardState } from './barner-card/banner-card.component';

export enum OboSecondScreenState {
  LoggedOut,
  StandBy,
  Checkout,
  SeatingMap,
  ContactInformation,
  FeedbackMessage,
  Survey,
  Farewell,
}

@Component({
  animations: [fadeAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MainScreenBusyService],
  selector: 'app-second-screen',
  standalone: false,
  styleUrl: './obo-second-screen.component.scss',
  templateUrl: './obo-second-screen.component.html',
})
export class OboSecondScreenComponent implements OnInit, OnDestroy {
  static readonly farewellTimeout = 10000;
  static readonly surveyTimeout = 45000;
  static readonly secondScreenBodyClass = 'obo-second-screen-active';

  readonly #cdr = inject(ChangeDetectorRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #oboSecondScreenDataService = inject(OboSecondScreenDataService);
  readonly #oboSecondScreenStorageService = inject(OboSecondScreenStorageService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerLogoService = inject(PartnerLogoService);
  readonly #secondScreenLoggedOutBannerStorageService = inject(SecondScreenLoggedOutBannerStorageService);
  readonly #secondScreenConfigurationStorageService = inject(SecondScreenConfigurationStorageService);
  readonly #userShiftStorageService = inject(UserShiftStorageService);
  readonly #customLoggedOutBannerText = signal<string | null>(null);
  /** The configuration the POS tab stored for this screen; `null` keeps the hardcoded per-partner standby content. */
  readonly #secondScreenConfiguration = signal<SecondScreenConfiguration | null>(null);

  protected readonly oboSecondScreenState = OboSecondScreenState;
  protected readonly oboSecondScreenPartnerState = OboSecondScreenPartnerState;
  protected readonly bannerCardState = BannerCardState;
  /** The idle motion pauses while the main screen is busy: both screens share one renderer process on the terminal. */
  protected readonly isMainScreenBusy = inject(MainScreenBusyService).isBusy;

  static readonly defaultLoggedOutBannerClosedTitleKey = 'oboSecondScreen.loading.title';
  static readonly customLoggedOutBannerClosedTitleKey = 'oboSecondScreen.loading.customTitle';

  bannerLogo: string = DEFAULT_PARTNER_LOGO;
  lastPartnerId: number | null = null;
  partnerState: OboSecondScreenPartnerState | null = null;
  paymentInProgress = false;
  asideCoverItems: SliderItem[] = [];
  protected readonly secondScreenConfiguration = this.#secondScreenConfiguration.asReadonly();
  /** Replaces the plan image behind the farewell banner. */
  protected readonly farewellImageUrl = computed(() => toFilledValue(this.#secondScreenConfiguration()?.farewell_image_url));
  standbyCarouselItems: SliderItem[] = [];
  state: OboSecondScreenState = OboSecondScreenState.LoggedOut;

  readonly loggedOutBannerTitle = computed(() =>
    this.#customLoggedOutBannerText() !== null
      ? OboSecondScreenComponent.customLoggedOutBannerClosedTitleKey
      : OboSecondScreenComponent.defaultLoggedOutBannerClosedTitleKey,
  );

  readonly loggedOutBannerTitleParams = computed<{ onsiteSetupName: string } | null>(() => {
    const customText = this.#customLoggedOutBannerText();
    return customText !== null ? { onsiteSetupName: customText } : null;
  });

  #data: OboSecondScreenData | null = null;
  private timeout: NodeJS.Timeout | null = null;
  private shift: Shift | null = null;

  getCart(): OboSecondScreenCart | null {
    return this.#data?.cart ?? null;
  }

  getPartnerId(): number | null {
    return this.#data?.partnerId ?? null;
  }

  getPlaceId(): number | null {
    return this.#data?.placeId ?? null;
  }

  getPlan(): OboSecondScreenPlan | null {
    return this.#data?.plan ?? null;
  }

  getSeatingMap(): OboSecondScreenStoredSeatingMap | null {
    return this.#data?.seatingMap ?? null;
  }

  getAsideCoverItems(): SliderItem[] {
    return this.asideCoverItems;
  }

  #buildAsideCoverItems(): SliderItem[] {
    const cartPlanGroups = this.#data?.cart?.planGroups ?? [];
    const dedupedItems: SliderItem[] = [];
    const seenImages = new Set<string>();

    for (const group of cartPlanGroups) {
      const image = group.plan?.imageUrl;
      if (!image || seenImages.has(image)) {
        continue;
      }
      dedupedItems.push({
        alt: group.plan?.name ?? '',
        image,
      });
      seenImages.add(image);
    }

    if (dedupedItems.length > 0) {
      return dedupedItems;
    }

    const fallbackImage = this.#data?.plan?.imageUrl;
    if (!fallbackImage) {
      return [];
    }

    return [
      {
        alt: this.#data?.plan?.name ?? '',
        image: fallbackImage,
      },
    ];
  }

  getShiftId(): string | null {
    return this.shift?.id ?? null;
  }

  ngOnDestroy(): void {
    this.#setSecondScreenBodyClass(false);
    this.#setZendeskWidgetVisibility(true);
  }

  ngOnInit(): void {
    this.#setSecondScreenBodyClass(true);
    this.#setZendeskWidgetVisibility(false);
    this.#observeSecondScreenConfiguration();
    this.#oboSecondScreenStorageService
      .observeData()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(data => {
        this.updateState(data);
      });
    // The second screen runs in a separate tab from Fever Zone and only syncs
    // state across them via localStorage + StorageEvent. Each tab has its own
    // PartnerService singleton, so subscribing to partner$() wouldn't see the
    // partner saved on the primary tab. Read directly from localStorage and
    // refresh the banner logo on cross-tab storage events.
    fromEvent<StorageEvent>(window, 'storage')
      .pipe(
        filter(event => event.key === PartnerService.partnerStorageKey),
        startWith(null),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.bannerLogo = this.#partnerLogoService.resolvePartnerLogo(this.#readPartner());
        this.#cdr.markForCheck();
      });
  }

  onSeatingMapUnavailable(): void {
    this.#oboSecondScreenDataService.setIsSeatingMapVisible(false);
  }

  #observeSecondScreenConfiguration(): void {
    this.#secondScreenConfigurationStorageService
      .observeSecondScreenConfiguration()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(configuration => {
        this.#secondScreenConfiguration.set(configuration);
        this.standbyCarouselItems = this.#resolveStandbyCarouselItems();
        this.#cdr.markForCheck();
      });
  }

  /** The configuration images win; without any, the partner keeps its current standby images (its hardcoded entry or the mosaic). */
  #resolveStandbyCarouselItems(): SliderItem[] {
    const configuration = this.#secondScreenConfiguration();
    const configurationItems = configuration === null ? [] : toStandbySliderItems(configuration);
    if (configurationItems.length > 0) {
      return configurationItems;
    }
    const id: number | null = this.#data?.partnerId ?? this.lastPartnerId ?? null;
    return id === null ? [] : resolvePartnerStandbyItems(id);
  }

  #readPartner(): Partner | null {
    const data: string | null = localStorage.getItem(PartnerService.partnerStorageKey);
    if (data === null) {
      return null;
    }
    try {
      return JSON.parse(data) as Partner;
    } catch {
      return null;
    }
  }

  #setSecondScreenBodyClass(isEnabled: boolean): void {
    if (isEnabled) {
      document.body.classList.add(OboSecondScreenComponent.secondScreenBodyClass);
      return;
    }
    document.body.classList.remove(OboSecondScreenComponent.secondScreenBodyClass);
  }

  #setZendeskWidgetVisibility(isVisible: boolean): void {
    const action = isVisible ? 'show' : 'hide';
    window.zE?.('webWidget', action);
  }

  #upscaleAsideCoverImages(items: SliderItem[]): SliderItem[] {
    const isImageUpscaleEnabled = this.#optimizelyService.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.ENABLE_SECOND_SCREEN_IMAGE_UPSCALE,
      team: 'b2b-shops',
    });
    if (isImageUpscaleEnabled !== true) {
      return items;
    }
    return items.map((item: SliderItem) => ({ ...item, image: upscaleCloudinaryImageUrl(item.image) }));
  }

  private updateState(data: OboSecondScreenData | null): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    if (data) {
      this.lastPartnerId = data.partnerId;
    }

    this.#data = data;
    this.shift = this.#userShiftStorageService.getOpenedShift();

    if (!data) {
      this.state = OboSecondScreenState.LoggedOut;
      this.#customLoggedOutBannerText.set(this.#secondScreenLoggedOutBannerStorageService.getSecondScreenLoggedOutBannerText());
    } else if (data.isSeatingMapVisible && data.plan && data.seatingMap?.provider !== SeatingProviderEnum.ONEBOX) {
      this.state = OboSecondScreenState.SeatingMap;
    } else if (data.isContactInfoActive && data.plan) {
      this.state = OboSecondScreenState.ContactInformation;
    } else if (!data.plan || !data.cart || !data.cart.sessions || data.cart.sessions.length === 0) {
      this.state = OboSecondScreenState.StandBy;
    } else if (!data.payment) {
      this.state = OboSecondScreenState.Checkout;
    } else if (data.showSurvey && this.shift && data.placeId && !data.isSurveyCompleted) {
      this.state = OboSecondScreenState.Survey;
      this.timeout = setTimeout(() => this.#oboSecondScreenDataService.completeSurvey(), OboSecondScreenComponent.surveyTimeout);
    } else {
      this.state = OboSecondScreenState.Farewell;
      this.timeout = setTimeout(() => {
        this.#oboSecondScreenDataService.resetCart();
      }, OboSecondScreenComponent.farewellTimeout);
    }
    this.asideCoverItems = this.#upscaleAsideCoverImages(this.#buildAsideCoverItems());

    const id: number | null = data?.partnerId ?? this.lastPartnerId ?? null;
    this.standbyCarouselItems = this.#resolveStandbyCarouselItems();
    this.partnerState = id == null ? null : resolvePartnerState(id);

    this.#cdr.markForCheck();
  }
}
