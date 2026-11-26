import { BlockDefinition } from '../block-definition';
import { spacerPropsFromDto, spacerPropsToDto } from './spacer.dto';
import { SPACER_FIELDS } from './spacer.field-contract';
import { SPACER_I18N } from './spacer.i18n-keys';

export const SPACER_BLOCK: BlockDefinition<'spacer'> = {
  type: 'spacer',
  icon: 'height',
  labelKey: SPACER_I18N.componentLabel,
  createDefaultProps: () => ({ size: 32 }),
  dtoType: 'spacer',
  fromDto: spacerPropsFromDto,
  toDto: spacerPropsToDto,
  fields: SPACER_FIELDS,
};
