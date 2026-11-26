// Wire-shape DTOs for the HTML content schema. Keys AND type-discriminator
// values are snake_case to match the backend `BlockType` Python enum and the
// `JSONField` payload. The `ContentSchemaAdapter` translates these into the
// camelCase domain models in `block.model.ts`.
//
// Per-type DTO interfaces live in each block's folder
// (`blocks/<type>/<type>.dto.ts`); this file only assembles the cross-type
// unions and re-exports the per-type interfaces for backwards compatibility.

import type { EventDetailsPropsDTO } from '../blocks/event-details/event-details.dto';
import type { FullImagePropsDTO } from '../blocks/full-image/full-image.dto';
import type { FullVideoPropsDTO } from '../blocks/full-video/full-video.dto';
import type { ImageGridPropsDTO } from '../blocks/image-grid/image-grid.dto';
import type { InfoCardPropsDTO } from '../blocks/info-card/info-card.dto';
import type { ParagraphPropsDTO } from '../blocks/paragraph/paragraph.dto';
import type { SpacerPropsDTO } from '../blocks/spacer/spacer.dto';
import type { TabsPropsDTO } from '../blocks/tabs/tabs.dto';
import type { TitlePropsDTO } from '../blocks/title/title.dto';

export type BlockTypeDTO =
  | 'title'
  | 'paragraph'
  | 'spacer'
  | 'full_image'
  | 'full_video'
  | 'image_grid'
  | 'event_details'
  | 'info_card'
  | 'tabs';

export type BlockDTO =
  | { id: string; type: 'title'; props: TitlePropsDTO }
  | { id: string; type: 'paragraph'; props: ParagraphPropsDTO }
  | { id: string; type: 'spacer'; props: SpacerPropsDTO }
  | { id: string; type: 'full_image'; props: FullImagePropsDTO }
  | { id: string; type: 'full_video'; props: FullVideoPropsDTO }
  | { id: string; type: 'image_grid'; props: ImageGridPropsDTO }
  | { id: string; type: 'event_details'; props: EventDetailsPropsDTO }
  | { id: string; type: 'info_card'; props: InfoCardPropsDTO }
  | { id: string; type: 'tabs'; props: TabsPropsDTO };

export interface ContentSchemaDTO {
  channel_id: string | null;
  structure: BlockDTO[];
  /** Schema UUID; needed to build the translation upsert path. Present only on the language fetch. */
  id?: string | null;
  /** `code` -> `{ status }` for the requested language. Absent/empty on the base-language fetch. */
  translations?: Record<string, { status: string }>;
}

/** camelCase domain discriminator → snake_case wire discriminator. */
interface DtoTypeByBlockType {
  title: 'title';
  paragraph: 'paragraph';
  spacer: 'spacer';
  fullImage: 'full_image';
  fullVideo: 'full_video';
  imageGrid: 'image_grid';
  eventDetails: 'event_details';
  infoCard: 'info_card';
  tabs: 'tabs';
}

/** Wire discriminator of one block type, e.g. `BlockTypeDtoOf<'fullImage'>` = `'full_image'`. */
export type BlockTypeDtoOf<K extends keyof DtoTypeByBlockType> = DtoTypeByBlockType[K];

/** Wire props of one block type, e.g. `DtoPropsOf<'tabs'>` = `TabsPropsDTO`. */
export type DtoPropsOf<K extends keyof DtoTypeByBlockType> = Extract<BlockDTO, { type: BlockTypeDtoOf<K> }>['props'];

// ── Backwards-compatible re-exports ──────────────────────────────────────────

export type { EventDetailsPropsDTO } from '../blocks/event-details/event-details.dto';
export type { FullImagePropsDTO } from '../blocks/full-image/full-image.dto';
export type { FullVideoPropsDTO } from '../blocks/full-video/full-video.dto';
export type { ImageGridItemDTO, ImageGridPropsDTO } from '../blocks/image-grid/image-grid.dto';
export type { InfoCardDTO, InfoCardPropsDTO } from '../blocks/info-card/info-card.dto';
export type { ParagraphPropsDTO } from '../blocks/paragraph/paragraph.dto';
export type { SpacerPropsDTO } from '../blocks/spacer/spacer.dto';
export type { TabItemDTO, TabsPropsDTO } from '../blocks/tabs/tabs.dto';
export type { TitlePropsDTO } from '../blocks/title/title.dto';
