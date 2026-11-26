import { NameData } from '@fz-original/app/shared/models/data/data.model';
import { Place } from '@fz-original/app/shared/models/plan/place.model';

export interface KioskPlanItem extends NameData<number> {
  cover_image: string;
  is_purchasable: boolean;
  kiosk_cover_image: string | null;
  kiosk_images?: string[];
  location: Location;
  price_info: KioskPlanPriceInfo;
  rating: KioskPlanRating;
}

export interface Location {
  name: string;
}

export interface KioskPlanPriceInfo {
  amount: number;
  currency: string;
  hide: boolean;
  strikethrough: number | null;
}

export interface KioskPlanRating {
  average: number;
  hide: boolean;
  num_ratings: number;
}

export interface KioskPlanPresentationSettings {
  is_real_time: boolean;
}

export interface KioskPlanDetail extends NameData<number> {
  description: string;
  extra?: KioskExtra;
  gallery: string[];
  place: Place;
  places: Place[];
  presentation_settings?: KioskPlanPresentationSettings;
}

export interface KioskPlansResponse {
  data: KioskPlanItem[];
}

export interface KioskExtra {
  timeless: boolean;
}
