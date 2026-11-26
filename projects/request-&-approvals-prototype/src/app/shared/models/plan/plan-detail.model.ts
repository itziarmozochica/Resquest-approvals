import { ContentSchemaDTO } from '../../../modules/content-plan/components/plan-edition/description-builder/models/block.dto';
import { Block } from '../../../modules/content-plan/components/plan-edition/description-builder/models/block.model';
import {
  ExplodePipeOption,
  SelectorSettingType,
  SessionSelectorType,
} from '../../../modules/event-settings/models/selector-session-section.enum';
import { Channel, ChannelDTO } from '../channel/channel.model';
import { PlanStatus } from './plan-status.enum';

export interface VenueDTO {
  address?: string;
  city_name?: string;
  currency?: string;
  google_place_id?: string;
  id: number;
  is_public?: boolean;
  latitude?: number;
  longitude?: number;
  name: string;
  timezone?: string;
  type?: string;
  zip_code?: string;
}

export interface PlanDetailDTO {
  absolute_url: string;
  base_locale?: string;
  calendar_selector?: boolean;
  catalog_main_plan_id?: number;
  channels: ChannelDTO[];
  default_capacity_per_time_slot: number;
  description: string;
  gallery: string[];
  has_adaptive_pricing: boolean;
  has_declarative_inventory?: boolean;
  hidden_feed: boolean;
  id: number;
  is_candlelight?: boolean;
  is_eligible_for_redirect: boolean;
  is_waitlist: boolean;
  label_format?: string;
  name: string;
  label_explode_pipe_option?: string;
  partner_id?: number;
  provider_name?: string | null;
  published_at?: string | null;
  queue_overview_channel_ids?: string[];
  selector_label_explode_pipe?: boolean;
  selector_setting_type?: string;
  session_selector_type?: string;
  short_description?: string;
  status: string;
  translation_languages: string[];
  type?: string;
  venues: VenueDTO[];
  content_schema?: ContentSchemaDTO | null;
  has_components_description?: boolean;
  showcase_venue?: VenueDTO | null;
}

export interface Venue {
  address?: string;
  cityName?: string;
  country?: string;
  currency?: string;
  googlePlaceId?: string;
  id?: number;
  isPublic?: boolean;
  isSecret?: boolean;
  latitude?: number;
  longitude?: number;
  name: string;
  region?: string;
  timezone?: string;
  zipCode?: string;
  type?: string;
}

export class PlanDetail {
  constructor(
    public id: number,
    public name: string,
    public description: string,
    public isWaitlist: boolean,
    public venues: Venue[],
    public gallery: string[],
    public channels: Channel[],
    public status: PlanStatus,
    public absoluteUrl: string,
    public hiddenFeed: boolean,
    public defaultCapacityPerTimeSlot: number | null,
    public translationLanguages: string[],
    public hasAdaptivePricing: boolean,
    public isEligibleForRedirect: boolean,
    public partnerId?: number,
    public shortDescription?: string,
    public baseLocale?: string,
    public labelFormat?: string,
    public themedUrl?: string,
    public type?: string,
    public isPrizeDraw?: boolean,
    public isAuction?: boolean,
    public sessionSelectorType?: SessionSelectorType,
    public selectorLabelExplodePipe?: boolean,
    public labelExplodePipeOption?: ExplodePipeOption,
    public publishedAt?: Date | null,
    public contentSchema?: Block[],
    public hasComponentsDescription?: boolean,
  ) {}

  /** Event settings › Selector settings: the date is picked in a calendar. */
  calendarSelector?: boolean;
  catalogMainPlanId?: number;
  /** Event settings › Selector settings: how the ticket types are laid out (e.g. multi detailed). */
  selectorSettingType?: SelectorSettingType;
  showcaseVenue?: Venue;
  hasDeclarativeInventory?: boolean;
  isCandlelight = false;
  providerName: string | null = null;
  queueOverviewChannelIds?: string[];
}
