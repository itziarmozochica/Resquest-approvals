import type { BlockType, ComponentTypeDef } from '../models/block.model';
import { BLOCK_DEFINITIONS } from './block-registry';

function paletteEntry({ icon, labelKey }: { icon: string; labelKey: string }): ComponentTypeDef {
  return { icon, labelKey };
}

/**
 * Palette metadata for every block type: icon + localised label, DERIVED from
 * each block's definition so the source of truth stays in the block's folder.
 *
 * Re-exported from `models/block.model.ts` for backwards compatibility.
 */
export const COMPONENT_TYPES: Record<BlockType, ComponentTypeDef> = {
  title: paletteEntry(BLOCK_DEFINITIONS.title),
  paragraph: paletteEntry(BLOCK_DEFINITIONS.paragraph),
  spacer: paletteEntry(BLOCK_DEFINITIONS.spacer),
  fullImage: paletteEntry(BLOCK_DEFINITIONS.fullImage),
  fullVideo: paletteEntry(BLOCK_DEFINITIONS.fullVideo),
  imageGrid: paletteEntry(BLOCK_DEFINITIONS.imageGrid),
  eventDetails: paletteEntry(BLOCK_DEFINITIONS.eventDetails),
  infoCard: paletteEntry(BLOCK_DEFINITIONS.infoCard),
  tabs: paletteEntry(BLOCK_DEFINITIONS.tabs),
};

/** Display order of the block types in the palette and the add-menu. */
export const PALETTE_ORDER: BlockType[] = [
  'title',
  'paragraph',
  'spacer',
  'fullImage',
  'fullVideo',
  'imageGrid',
  'eventDetails',
  'infoCard',
  'tabs',
];
