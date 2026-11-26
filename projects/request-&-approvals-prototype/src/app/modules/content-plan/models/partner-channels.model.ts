export interface PartnerChannelDTO {
  id: string;
  name: string;
  type: string;
}

export type PartnerChannel = PartnerChannelDTO;

export interface PartnerChannelsDataDTO {
  channels: PartnerChannelDTO[];
}

export interface PartnerChannelsResponseDTO {
  data: PartnerChannelsDataDTO;
}
