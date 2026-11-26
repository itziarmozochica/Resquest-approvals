import { Money } from '../money.model';
import { PlanReviewRequestStatus } from '../plan-review/plan-review-request.model';
import { Place, PlaceData } from './place.model';
import { PlanKind } from './plan-kind.enum';
import { PlanStatus } from './plan-status.enum';

export type BundleType = 'bundle' | 'upsell';
export type BundleFlow = 'standard' | 'flexible';

export interface BundleDTO {
  bundle_id: number;
  plan_id: number;
  optional: boolean;
  is_available: boolean;
}

export interface BundleInformationDTO {
  bundle_configuration_id: number;
  min_size: number | null;
  max_size: number | null;
  bundles: BundleDTO[];
  type: BundleType;
  flow: BundleFlow;
  is_purchasable: boolean;
}

export interface SecondaryPlanInformationDTO {
  cover_image: string;
  id: number;
  name: string;
}

export interface Bundle {
  bundleId: number;
  planId: number;
  optional: boolean;
  isAvailable: boolean;
}

export interface BundleInformation {
  bundleConfigurationId: number;
  minSize: number | null;
  maxSize: number | null;
  bundles: Bundle[];
  type: BundleType;
  flow: BundleFlow;
  isPurchasable: boolean;
}

export interface SecondaryPlanInformation {
  coverImage: string;
  id: number;
  name: string;
}

export interface PlanLatestReview {
  reviewer: number | null;
  status: PlanReviewRequestStatus;
}

export interface PlansData {
  plans: PlanData[];
}

export interface PlanData {
  first_place_address: string;
  first_place_city_name: string;
  free_tickets_sold: number;
  gross_revenue: Money;
  has_multiple_places: boolean;
  id: number;
  image_url: string;
  is_asset_based: boolean;
  has_seating_provider?: boolean;
  seating_provider?: string | null;
  has_declarative_inventory?: boolean;
  is_hidden_feed: boolean;
  is_published: boolean;
  has_ever_been_published?: boolean;
  is_sold_out: boolean;
  kind: PlanKind;
  name: string;
  paid_tickets_sold: number;
  places: PlaceData[];
  status: PlanStatus;
  timezone: string;
  add_ons_sold?: number;
  created_at?: string;
  first_session_date?: string;
  is_sold_in_multiple_cities?: boolean;
  last_expired_session_date?: string;
  last_expired_session_date_with_attendees?: string;
  last_session_date?: string;
  latest_review?: PlanLatestReview | null;
  next_session_date?: string;
  next_session_date_with_attendees?: string;
  partner_id?: number;
  bundle_information?: BundleInformationDTO | null;
  secondary_plans_information?: SecondaryPlanInformationDTO[];
}

export interface PlanDetailPublicResponseRating {
  average: number;
  is_hidden: boolean;
  num_ratings: number;
}

export interface PlanDetailPublicResponse {
  gallery: string[];
  id: number;
  logo_url: string;
  name: string;
  partner_id: number;
  places: PlaceData[];
  rating: PlanDetailPublicResponseRating;
}

export interface PlanDetailPublic {
  coverImage: string;
  id: number;
  logoUrl: string;
  name: string;
  partnerId: number;
  rating: PlanDetailPublicResponseRating;
  venue: string;
}

export class Plan {
  constructor(
    public id?: number,
    public name?: string,
    public createdAt?: string | null,
    public kind?: PlanKind,
    public pictureURL?: string,
    public status?: PlanStatus,
    public isPublished?: boolean,
    public isHiddenFeed?: boolean,
    public isSoldOut?: boolean,
    public grossRevenue?: Money | null,
    public paidTicketsSold?: number,
    public freeTicketsSold?: number,
    public hasMultiplePlaces?: boolean,
    public firstPlace?: {
      addressName: string;
      cityName: string;
    },
    public places?: Place[],
    public isSoldInMultipleCities?: boolean,
    public timezone?: string,
    public firstSessionDate?: string | null,
    public lastSessionDate?: string | null,
    public nextSessionDate?: string | null,
    public nextSessionDateWithAttendees?: string | null,
    public lastExpiredSessionDate?: string | null,
    public lastExpiredSessionDateWithAttendees?: string | null,
    public addOnsSold?: number | null,
    public partnerId?: number | null,
    public isAssetBased?: boolean,
    public hasSeatingProvider?: boolean,
    public latestReview?: PlanLatestReview | null,
    public hasEverBeenPublished?: boolean,
    public hasDeclarativeInventory?: boolean,
    public seatingProvider?: string | null,
  ) {}

  bundleInformation?: BundleInformation;
  secondaryPlansInformation?: SecondaryPlanInformation[];

  get isPrizeDraw(): boolean {
    return this.kind === PlanKind.PRIZE_DRAW;
  }

  get isAuction(): boolean {
    return this.kind === PlanKind.AUCTION;
  }

  clone(): Plan {
    const { addressName, cityName } = this.firstPlace ?? {};
    const fistPlace = cityName && addressName ? { addressName, cityName } : undefined;
    const cloned = new Plan(
      this.id,
      this.name,
      this.createdAt,
      this.kind,
      this.pictureURL,
      this.status,
      this.isPublished,
      this.isHiddenFeed,
      this.isSoldOut,
      this.grossRevenue,
      this.paidTicketsSold,
      this.freeTicketsSold,
      this.hasMultiplePlaces,
      fistPlace,
      this.places?.map(place => ({ ...place })),
      this.isSoldInMultipleCities,
      this.timezone,
      this.firstSessionDate,
      this.lastSessionDate,
      this.nextSessionDate,
      this.nextSessionDateWithAttendees,
      this.lastExpiredSessionDate,
      this.lastExpiredSessionDateWithAttendees,
      this.addOnsSold,
      this.partnerId,
      this.isAssetBased,
      this.hasSeatingProvider,
      this.latestReview ? { ...this.latestReview } : this.latestReview,
      this.hasEverBeenPublished,
      this.hasDeclarativeInventory,
      this.seatingProvider,
    );
    cloned.bundleInformation = structuredClone(this.bundleInformation);
    cloned.secondaryPlansInformation = structuredClone(this.secondaryPlansInformation);
    return cloned;
  }

  getFreeSoldTickets(): number {
    if (this.freeTicketsSold === undefined || this.freeTicketsSold === null) {
      return 0;
    }
    return this.freeTicketsSold;
  }

  getPaidSoldTickets(): number {
    if (this.paidTicketsSold === undefined || this.paidTicketsSold === null) {
      return 0;
    }
    return this.paidTicketsSold;
  }

  getSoldAddons(): number {
    return this.addOnsSold ?? 0;
  }

  getSoldTickets(): number {
    return this.getFreeSoldTickets() + this.getPaidSoldTickets();
  }

  isDraft(): boolean {
    return this.status === PlanStatus.DRAFT;
  }

  isGiftCard(): boolean {
    return this.kind === PlanKind.GIFT_CARD;
  }

  isOffSale(): boolean {
    return this.status === PlanStatus.OFF_SALE;
  }

  isOnSale(): boolean {
    return this.status === PlanStatus.ON_SALE;
  }

  isStandard(): boolean {
    return this.kind === PlanKind.STANDARD;
  }

  isTimeless(): boolean {
    return this.kind === PlanKind.TIMELESS;
  }

  isWaitlist(): boolean {
    return this.kind === PlanKind.WAITLIST;
  }
}

export interface PlanLiveStatusDTO {
  is_active: boolean;
  is_hidden_feed: boolean;
  is_sold_out: boolean;
  published_at: string | null;
  status: PlanStatus;
}

export interface PlanLiveAnalyticsDTO {
  add_ons_sold: number;
  free_tickets_sold: number;
  gross_revenue: number;
  paid_tickets_sold: number;
}

export interface PlanLiveStatusAndAnalyticsDTO {
  analytics: PlanLiveAnalyticsDTO;
  status: PlanLiveStatusDTO;
}

export interface PlanLiveStatus {
  isActive: boolean;
  isHiddenFeed: boolean;
  isSoldOut: boolean;
  publishedAt: Date | null;
  status: PlanStatus;
}

export interface PlanLiveAnalytics {
  addOnsSold: number;
  freeTicketsSold: number;
  grossRevenue: number;
  paidTicketsSold: number;
}

export interface PlanLiveStatusAndAnalytics {
  analytics: PlanLiveAnalytics;
  status: PlanLiveStatus;
}
