import { uid } from '../_shared/uid.util';
import { IMAGE_GRID_ITEM_COUNT } from './image-grid.constants';
import { ImageGridItem } from './image-grid.model';

export function createImageGridItem(title = '', body = ''): ImageGridItem {
  return { id: uid(), src: '', title, body };
}

/** Pads or truncates wire/in-memory lists so panel, canvas and DTO stay aligned. */
export function normalizeImageGridItems(items: readonly ImageGridItem[]): ImageGridItem[] {
  const next = items.slice(0, IMAGE_GRID_ITEM_COUNT).map(item => ({ ...item }));
  while (next.length < IMAGE_GRID_ITEM_COUNT) {
    next.push(createImageGridItem());
  }
  return next;
}
