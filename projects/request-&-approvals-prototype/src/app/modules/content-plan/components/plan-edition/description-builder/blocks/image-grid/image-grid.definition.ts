import { uid } from '../_shared/uid.util';
import { BlockDefinition } from '../block-definition';
import { IMAGE_GRID_ITEM_COUNT } from './image-grid.constants';
import { imageGridPropsFromDto, imageGridPropsToDto } from './image-grid.dto';
import { IMAGE_GRID_FIELDS } from './image-grid.field-contract';
import { createImageGridItem } from './image-grid.helpers';
import { IMAGE_GRID_I18N } from './image-grid.i18n-keys';

export const IMAGE_GRID_BLOCK: BlockDefinition<'imageGrid'> = {
  type: 'imageGrid',
  icon: 'grid_view',
  labelKey: IMAGE_GRID_I18N.componentLabel,
  createDefaultProps: defaults => ({
    items: Array.from({ length: IMAGE_GRID_ITEM_COUNT }, () => createImageGridItem(defaults.imageGridTitle, defaults.imageGridBody)),
  }),
  cloneProps: props => ({
    ...props,
    items: props.items.map(it => ({ ...it, id: uid() })),
  }),
  dtoType: 'image_grid',
  fromDto: imageGridPropsFromDto,
  toDto: imageGridPropsToDto,
  fields: IMAGE_GRID_FIELDS,
};
