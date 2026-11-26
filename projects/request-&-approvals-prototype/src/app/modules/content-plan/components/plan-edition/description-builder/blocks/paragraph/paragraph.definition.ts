import { BlockDefinition } from '../block-definition';
import { paragraphPropsFromDto, paragraphPropsToDto } from './paragraph.dto';
import { PARAGRAPH_FIELDS } from './paragraph.field-contract';
import { PARAGRAPH_I18N } from './paragraph.i18n-keys';

export const PARAGRAPH_BLOCK: BlockDefinition<'paragraph'> = {
  type: 'paragraph',
  icon: 'notes',
  labelKey: PARAGRAPH_I18N.componentLabel,
  createDefaultProps: () => ({ text: '' }),
  dtoType: 'paragraph',
  fromDto: paragraphPropsFromDto,
  toDto: paragraphPropsToDto,
  fields: PARAGRAPH_FIELDS,
};
