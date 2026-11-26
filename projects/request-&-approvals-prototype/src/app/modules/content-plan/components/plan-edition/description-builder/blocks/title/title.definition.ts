import { BlockDefinition } from '../block-definition';
import { titlePropsFromDto, titlePropsToDto } from './title.dto';
import { TITLE_FIELDS } from './title.field-contract';
import { TITLE_I18N } from './title.i18n-keys';

export const TITLE_BLOCK: BlockDefinition<'title'> = {
  type: 'title',
  icon: 'title',
  labelKey: TITLE_I18N.componentLabel,
  createDefaultProps: () => ({ text: '', level: 'h2' }),
  dtoType: 'title',
  fromDto: titlePropsFromDto,
  toDto: titlePropsToDto,
  fields: TITLE_FIELDS,
};
