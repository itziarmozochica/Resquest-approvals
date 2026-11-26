export interface SlackChannelApiDto {
  id: string;
  name: string;
}

export type SlackChannelsApiData = SlackChannelApiDto[];

export interface SlackChannel {
  id: string;
  name: string;
}

export function mapSlackChannelDto(dto: SlackChannelApiDto): SlackChannel {
  return {
    id: dto.id,
    name: dto.name,
  };
}
