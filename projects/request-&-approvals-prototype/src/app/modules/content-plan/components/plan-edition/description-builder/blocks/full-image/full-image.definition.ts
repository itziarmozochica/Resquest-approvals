import { BlockDefinition } from '../block-definition';
import { fullImagePropsFromDto, fullImagePropsToDto } from './full-image.dto';
import { FULL_IMAGE_FIELDS } from './full-image.field-contract';
import { FULL_IMAGE_I18N } from './full-image.i18n-keys';

export const FULL_IMAGE_BLOCK: BlockDefinition<'fullImage'> = {
  type: 'fullImage',
  icon: 'image',
  labelKey: FULL_IMAGE_I18N.componentLabel,
  createDefaultProps: () => ({ src: '' }),
  dtoType: 'full_image',
  fromDto: fullImagePropsFromDto,
  toDto: fullImagePropsToDto,
  fields: FULL_IMAGE_FIELDS,
};
