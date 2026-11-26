import {
  transformCenterTagToTextAlignCenter,
  transformQuillText,
} from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-legacy-content.utils';

import { asNonEmptyString, asString, isRecord } from '../_shared/dto-codec.util';
import { uid } from '../_shared/uid.util';
import { normalizeImageGridItems } from './image-grid.helpers';
import { ImageGridItem, ImageGridProps } from './image-grid.model';

/** Wire shape (snake_case) — see models/block.dto.ts for the conventions. */
export interface ImageGridItemDTO {
  id: string;
  src: string;
  title: string;
  body: string;
}

export interface ImageGridPropsDTO {
  items: ImageGridItemDTO[];
}

export function imageGridPropsFromDto(raw: Record<string, unknown>): ImageGridProps {
  const items = Array.isArray(raw['items']) ? raw['items'] : [];
  const parsed = items.filter(isRecord).map(
    (it): ImageGridItem => ({
      id: asNonEmptyString(it['id'], uid),
      src: asString(it['src']),
      title: asString(it['title']),
      body: transformCenterTagToTextAlignCenter(asString(it['body'])),
    }),
  );
  return { items: normalizeImageGridItems(parsed) };
}

export function imageGridPropsToDto(p: ImageGridProps): ImageGridPropsDTO {
  return {
    items: normalizeImageGridItems(p.items).map(
      (it): ImageGridItemDTO => ({
        id: it.id,
        src: it.src,
        title: it.title,
        body: transformQuillText(it.body),
      }),
    ),
  };
}
