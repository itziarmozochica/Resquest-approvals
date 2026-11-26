export interface OnsiteSetupQueryBase {
  partnerId: string;
}

export interface GetOnsiteSetupQuery extends OnsiteSetupQueryBase {
  onsiteSetupId: string;
}

export interface GetOnsiteSetupByPlaceQuery extends GetOnsiteSetupQuery {
  placeId: number;
}
