export interface SessionTypeTranslationDataDTO {
  label: string | null;
  instructions: string | null;
  details: string | null;
}

export interface SessionTypeTranslationContextDTO {
  entity_id: number;
  channel_id: string | null;
  language: string;
}

export interface SessionTypeTranslationDTO {
  entity: string;
  context: SessionTypeTranslationContextDTO;
  data: SessionTypeTranslationDataDTO;
}

export interface SessionTypeTranslationsResponseDTO {
  data?: {
    translations?: SessionTypeTranslationDTO[];
  } | null;
  error?: unknown;
}

export interface SessionTypeTranslation {
  channelId: string | null;
  details: string;
  entityId: number;
  instructions: string;
  label: string;
  language: string;
}
