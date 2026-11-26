import type { BlockTypeDTO } from '../models/block.dto';
import type { BlockType } from '../models/block.model';
import { BlockDefinition } from './block-definition';
import { EVENT_DETAILS_BLOCK } from './event-details/event-details.definition';
import { FULL_IMAGE_BLOCK } from './full-image/full-image.definition';
import { FULL_VIDEO_BLOCK } from './full-video/full-video.definition';
import { IMAGE_GRID_BLOCK } from './image-grid/image-grid.definition';
import { INFO_CARD_BLOCK } from './info-card/info-card.definition';
import { PARAGRAPH_BLOCK } from './paragraph/paragraph.definition';
import { SPACER_BLOCK } from './spacer/spacer.definition';
import { TABS_BLOCK } from './tabs/tabs.definition';
import { TITLE_BLOCK } from './title/title.definition';

/**
 * The ONLY aggregation point of the per-block definitions. Generic machinery
 * (factories, adapters, export service) dispatches through this record
 * instead of per-type switches.
 *
 * The mapped type keeps each entry narrowed to its own `BlockDefinition<K>`,
 * so per-definition internals stay fully typed; only the dispatch sites that
 * look a definition up by a runtime `BlockType` need a localized cast.
 */
export const BLOCK_DEFINITIONS: { readonly [K in BlockType]: BlockDefinition<K> } = {
  title: TITLE_BLOCK,
  paragraph: PARAGRAPH_BLOCK,
  spacer: SPACER_BLOCK,
  fullImage: FULL_IMAGE_BLOCK,
  fullVideo: FULL_VIDEO_BLOCK,
  imageGrid: IMAGE_GRID_BLOCK,
  eventDetails: EVENT_DETAILS_BLOCK,
  infoCard: INFO_CARD_BLOCK,
  tabs: TABS_BLOCK,
};

/**
 * Same definitions, indexed by the snake_case wire discriminator. Derived
 * from each definition's `dtoType` so the two indexes can never diverge.
 */
export const BLOCK_DEFINITION_BY_DTO_TYPE: Readonly<Record<BlockTypeDTO, BlockDefinition>> = Object.fromEntries(
  Object.values(BLOCK_DEFINITIONS).map(definition => [definition.dtoType, definition]),
) as Record<BlockTypeDTO, BlockDefinition>;
