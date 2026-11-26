import { BlockDefinition } from '../block-definition';
import { fullVideoPropsFromDto, fullVideoPropsToDto } from './full-video.dto';
import { FULL_VIDEO_FIELDS } from './full-video.field-contract';
import { FULL_VIDEO_I18N } from './full-video.i18n-keys';

export const FULL_VIDEO_BLOCK: BlockDefinition<'fullVideo'> = {
  type: 'fullVideo',
  icon: 'movie',
  labelKey: FULL_VIDEO_I18N.componentLabel,
  createDefaultProps: () => ({ src: '' }),
  dtoType: 'full_video',
  fromDto: fullVideoPropsFromDto,
  toDto: fullVideoPropsToDto,
  fields: FULL_VIDEO_FIELDS,
};
