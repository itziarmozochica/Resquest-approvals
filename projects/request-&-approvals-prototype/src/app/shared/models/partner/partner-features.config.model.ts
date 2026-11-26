export type PartnerEntityFeaturesConfigInterface = {
  hasOnlyOwnedFilter?: boolean;
  isOnlyOwnedByDefault?: boolean;
};

export type PartnerVenuesFeaturesConfigInterface = PartnerEntityFeaturesConfigInterface;
export type PartnerCountriesFeaturesConfigInterface = PartnerEntityFeaturesConfigInterface;

export type PartnerFeaturesConfigInterface = {
  countries?: PartnerCountriesFeaturesConfigInterface;
  invoicingView?: boolean;
  venues?: PartnerVenuesFeaturesConfigInterface;
};

export class PartnerFeaturesConfig implements PartnerFeaturesConfigInterface {
  constructor(
    public countries?: PartnerCountriesFeaturesConfigInterface,
    public invoicingView?: boolean,
    public venues?: PartnerVenuesFeaturesConfigInterface,
  ) {}
}
