import { BlockDTO } from '../components/plan-edition/description-builder/models/block.dto';
import { Block } from '../components/plan-edition/description-builder/models/block.model';

export { TranslationEntity } from './translation-entity.enum';

export interface PlanTranslationContextDTO {
  entity_id: number;
  channel_id: string | null;
  language: string;
}

export interface PlanTranslationDataDTO {
  name: string;
  description: string;
  label_format?: string | null;
  mandatory_purchase_terms?: string | null;
  short_description?: string | null;
}

export interface PlanTranslationDTO {
  entity: string;
  context: PlanTranslationContextDTO;
  data: PlanTranslationDataDTO;
}

export interface PlanTranslationsResponseDTO {
  data?: {
    translations?: PlanTranslationDTO[];
  } | null;
  error?: any;
}

export interface SavePlanTranslationRequestDTO {
  entity: 'main_plan';
  context: {
    entity_id: number;
    channel_id: string | null;
    language: string;
  };
  data: {
    name?: string;
    description?: string;
    label_format?: string;
    mandatory_purchase_terms?: string;
    short_description?: string;
  };
  /**
   * Structured per-language payload kept out of the flat `data` map: today the
   * serialized `content_schema`, sent only for component-based descriptions.
   */
  additional_data?: {
    content_schema: BlockDTO[];
  };
}

export interface SavePlanTranslationPersistedBaseline {
  labelFormat?: string;
  shortDescription?: string;
}

export interface PlanTranslation {
  channelId: string | null;
  language: string;
  name?: string;
  description?: string;
  labelFormat?: string;
  mandatoryPurchaseTerms?: string;
  shortDescription?: string;
  /** Translated content-schema blocks (component-based descriptions); serialized into `metadata.content_schema` on save. */
  contentSchema?: Block[];
}
