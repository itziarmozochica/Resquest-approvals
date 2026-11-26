import type { SeatingProviderEnum } from '../../seating-selector/components/seating-selector/__data__/seating-provider.enum';

export interface SeatingMapState {
  event: string;
  places?: number;
  categories?: Array<string>;
  channels?: Array<string>;
  seats?: Array<string>;
  force_selectable_seats?: Array<string>;
  hold_token?: string;
  /** Sent by the seating-pool endpoint: true when the OneBox map sells in real time. */
  is_real_time?: boolean;
  select_whole_group?: boolean;
  multi_select_enabled?: boolean;
  readonly?: boolean;
  provider_public_key?: string;
  enable_quantity_input?: boolean;
  seating_provider?: SeatingProviderEnum;
  /** OneBox session of the map, sent by the seating-pool endpoint. Not produced by `SeatingMap.getState()`. */
  session_id?: number;
}

export class SeatingMap {
  constructor(
    public baseUrl: string,
    public id: string,
    public categories: Array<string>,
    public channels: Array<string>,
    public numberOfSeats: number,
    public assignedSeats: Array<string>,
    public holdToken: string,
    public selectWholeGroup: boolean,
    public providerPublicKey: string,
    public seatingPoolId: number | null = null,
  ) {}

  getState(readOnly?: boolean): SeatingMapState {
    return {
      event: this.id,
      places: this.numberOfSeats,
      categories: this.categories,
      channels: this.channels,
      seats: this.assignedSeats,
      hold_token: this.holdToken,
      select_whole_group: false,
      multi_select_enabled: true,
      readonly: readOnly ? readOnly : false,
      provider_public_key: this.providerPublicKey,
    };
  }
}
