import { InteractionConfigurationComposite } from './interaction-configuration-composite';
import { InteractionConfigurationConditional } from './interaction-configuration-conditional';

export type InteractionConfiguration = InteractionConfigurationConditional | InteractionConfigurationComposite;
