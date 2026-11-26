export interface SalesWindowResponseBaseDTO {
  since: string | null;
  until: string | null;
}

export interface SalesWindowDefaultResponseDTO extends SalesWindowResponseBaseDTO {}

export interface SalesWindowChannelResponseDTO extends SalesWindowResponseBaseDTO {
  channel_id: string;
}

export interface SalesWindowsResponseDTO {
  default: SalesWindowDefaultResponseDTO | null;
  by_channel?: SalesWindowChannelResponseDTO[] | null;
}

export interface SalesWindowRequestBaseDTO {
  since: string | null;
  until: string;
}

export interface SalesWindowDefaultRequestDTO extends SalesWindowRequestBaseDTO {}

export interface SalesWindowChannelRequestDTO extends SalesWindowRequestBaseDTO {
  channel_id: string;
}

export interface SalesWindowsRequestDTO {
  default: SalesWindowDefaultRequestDTO;
  by_channel: SalesWindowChannelRequestDTO[];
}
