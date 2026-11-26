import { InteractionConfigurationCompositeResponse } from './interaction-configuration-composite.response';
import { InteractionConfigurationConditionalResponse } from './interaction-configuration-conditional.response';

export type InteractionConfigurationResponse = InteractionConfigurationConditionalResponse | InteractionConfigurationCompositeResponse;
