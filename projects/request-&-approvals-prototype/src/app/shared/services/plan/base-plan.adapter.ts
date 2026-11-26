import { Money } from '../../models/money.model';
import { City } from '../../models/plan/city.model';
import { Place, PlaceData } from '../../models/plan/place.model';
import {
  Plan,
  PlanData,
  type BundleInformation,
  type BundleInformationDTO,
  type SecondaryPlanInformation,
} from '../../models/plan/plan.model';

export class BasePlanAdapter {
  protected getPlan(plan: PlanData): Plan {
    const result = new Plan(
      plan.id,
      plan.name,
      plan.created_at ? plan.created_at : null,
      plan.kind,
      plan.image_url,
      plan.status,
      plan.is_published,
      plan.is_hidden_feed,
      plan.is_sold_out,
      plan.gross_revenue && plan.gross_revenue.amount !== null && plan.gross_revenue.currency
        ? new Money(plan.gross_revenue.amount, plan.gross_revenue.currency)
        : null,
      plan.paid_tickets_sold,
      plan.free_tickets_sold,
      plan.has_multiple_places,
      {
        cityName: plan.first_place_city_name,
        addressName: plan.first_place_address,
      },
      this.getPlaces(plan),
      plan.is_sold_in_multiple_cities,
      plan.timezone,
      plan.first_session_date ? plan.first_session_date : null,
      plan.last_session_date ? plan.last_session_date : null,
      plan.next_session_date ? plan.next_session_date : null,
      plan.next_session_date_with_attendees ? plan.next_session_date_with_attendees : null,
      plan.last_expired_session_date ? plan.last_expired_session_date : null,
      plan.last_expired_session_date_with_attendees ? plan.last_expired_session_date_with_attendees : null,
      plan.add_ons_sold ? plan.add_ons_sold : null,
      plan.partner_id ? plan.partner_id : null,
      plan.is_asset_based,
      plan.has_seating_provider,
      plan.latest_review,
      plan.has_ever_been_published === true,
      plan.has_declarative_inventory,
      plan.seating_provider,
    );

    if (plan.bundle_information != null) {
      result.bundleInformation = this.#adaptBundleInformation(plan.bundle_information);
    }

    if (plan.secondary_plans_information != null) {
      result.secondaryPlansInformation = plan.secondary_plans_information.map(
        (item): SecondaryPlanInformation => ({
          coverImage: item.cover_image,
          id: item.id,
          name: item.name,
        }),
      );
    }

    return result;
  }

  #adaptBundleInformation(dto: BundleInformationDTO): BundleInformation {
    return {
      bundleConfigurationId: dto.bundle_configuration_id,
      minSize: dto.min_size,
      maxSize: dto.max_size,
      bundles: dto.bundles.map(b => ({
        bundleId: b.bundle_id,
        planId: b.plan_id,
        optional: b.optional,
        isAvailable: b.is_available,
      })),
      type: dto.type,
      flow: dto.flow,
      isPurchasable: dto.is_purchasable,
    };
  }

  protected getPlaces(plan: PlanData): Place[] {
    const places: Place[] = [];
    if (plan && plan.places) {
      plan.places.forEach(place => {
        places.push(new Place(place.id, place.name, place.address, this.getCity(place), place.zip_code ? place.zip_code : null));
      });
    }
    return places;
  }

  protected getCity(place: PlaceData): City | null {
    if (place && place.city) {
      return new City(
        place.city.id,
        place.city.name,
        place.city.timezone,
        place.city.standard_id,
        place.city.currency,
        place.city.country_iso_code ?? place.city.country,
      );
    }
    return null;
  }
}
