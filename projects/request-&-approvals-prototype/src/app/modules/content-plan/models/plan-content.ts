import { ContentSchemaDTO } from '../components/plan-edition/description-builder/models/block.dto';
import { Block } from '../components/plan-edition/description-builder/models/block.model';

export interface PlanContent {
  name?: string;
  description?: string | null;
  shortDescription?: string;
  contentSchema?: Block[];
  hasComponentsDescription?: boolean;
  channelId?: string | null;
}

export interface PlanContentDTO {
  plan_name?: string;
  plan_description?: string;
  plan_short_description?: string;
  has_components_description?: boolean;
  content_schema?: ContentSchemaDTO;
}
