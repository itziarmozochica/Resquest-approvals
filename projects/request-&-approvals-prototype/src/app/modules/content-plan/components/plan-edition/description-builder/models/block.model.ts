// Generic registry of the block domain model. Per-type props live in each
// block's folder (`blocks/<type>/<type>.model.ts`); this file only assembles
// the cross-type unions and re-exports the per-type interfaces for
// backwards compatibility.

import type { EventDetailsProps } from '../blocks/event-details/event-details.model';
import type { FullImageProps } from '../blocks/full-image/full-image.model';
import type { FullVideoProps } from '../blocks/full-video/full-video.model';
import type { ImageGridProps } from '../blocks/image-grid/image-grid.model';
import type { InfoCardProps } from '../blocks/info-card/info-card.model';
import type { ParagraphProps } from '../blocks/paragraph/paragraph.model';
import type { SpacerProps } from '../blocks/spacer/spacer.model';
import type { TabsProps } from '../blocks/tabs/tabs.model';
import type { TitleProps } from '../blocks/title/title.model';

export type BlockType = 'title' | 'paragraph' | 'spacer' | 'fullImage' | 'fullVideo' | 'imageGrid' | 'eventDetails' | 'infoCard' | 'tabs';

export interface ComponentTypeDef {
  icon: string;
  /** Translation key resolved at template time via the `translate` pipe. */
  labelKey: string;
}

// ── Discriminated union ──────────────────────────────────────────────────────

export type Block =
  | { id: string; type: 'title'; props: TitleProps }
  | { id: string; type: 'paragraph'; props: ParagraphProps }
  | { id: string; type: 'spacer'; props: SpacerProps }
  | { id: string; type: 'fullImage'; props: FullImageProps }
  | { id: string; type: 'fullVideo'; props: FullVideoProps }
  | { id: string; type: 'imageGrid'; props: ImageGridProps }
  | { id: string; type: 'eventDetails'; props: EventDetailsProps }
  | { id: string; type: 'infoCard'; props: InfoCardProps }
  | { id: string; type: 'tabs'; props: TabsProps };

export type BlockProps =
  | TitleProps
  | ParagraphProps
  | SpacerProps
  | FullImageProps
  | FullVideoProps
  | ImageGridProps
  | EventDetailsProps
  | InfoCardProps
  | TabsProps;

/** The `Block` narrowed to one type, e.g. `BlockOf<'tabs'>`. */
export type BlockOf<K extends BlockType> = Extract<Block, { type: K }>;

/** The props of one block type, e.g. `PropsOf<'tabs'>` = `TabsProps`. */
export type PropsOf<K extends BlockType> = BlockOf<K>['props'];

// ── Per-type re-exports ──────────────────────────────────────────────────────
// The per-type props interfaces live in each block's folder; re-exported here
// because this file IS the domain-model entry point that assembles them.

export type { EventDetailsProps } from '../blocks/event-details/event-details.model';
export type { FullImageProps } from '../blocks/full-image/full-image.model';
export type { FullVideoProps } from '../blocks/full-video/full-video.model';
export type { ImageGridItem, ImageGridProps } from '../blocks/image-grid/image-grid.model';
export type { InfoCard, InfoCardProps } from '../blocks/info-card/info-card.model';
export type { ParagraphProps } from '../blocks/paragraph/paragraph.model';
export type { SpacerProps } from '../blocks/spacer/spacer.model';
export type { TabItem, TabsProps } from '../blocks/tabs/tabs.model';
export type { TitleProps } from '../blocks/title/title.model';
