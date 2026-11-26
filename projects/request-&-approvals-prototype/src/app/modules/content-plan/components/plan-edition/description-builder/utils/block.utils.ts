// Generic block factory/clone machinery — dispatches through BLOCK_DEFINITIONS
// instead of per-type switches. Per-type logic lives in each block's folder
// (`blocks/<type>/`); type-agnostic helpers live in `blocks/_shared/`.
//
// This file also re-exports the symbols that historically lived here so
// existing importers keep compiling (barrel to be swept in the final cleanup).

import { BlockTextDefaults } from '../blocks/_shared/block-text-defaults';
import { uid } from '../blocks/_shared/uid.util';
import { BLOCK_DEFINITIONS } from '../blocks/block-registry';
import {
  Block,
  BlockProps,
  BlockType,
  EventDetailsProps,
  FullImageProps,
  ImageGridProps,
  InfoCardProps,
  ParagraphProps,
  SpacerProps,
  TabsProps,
  TitleProps,
} from '../models/block.model';

export function defaultProps(type: 'title', defaults: BlockTextDefaults): TitleProps;
export function defaultProps(type: 'paragraph', defaults: BlockTextDefaults): ParagraphProps;
export function defaultProps(type: 'spacer', defaults: BlockTextDefaults): SpacerProps;
export function defaultProps(type: 'fullImage', defaults: BlockTextDefaults): FullImageProps;
export function defaultProps(type: 'imageGrid', defaults: BlockTextDefaults): ImageGridProps;
export function defaultProps(type: 'eventDetails', defaults: BlockTextDefaults): EventDetailsProps;
export function defaultProps(type: 'infoCard', defaults: BlockTextDefaults): InfoCardProps;
export function defaultProps(type: 'tabs', defaults: BlockTextDefaults): TabsProps;
export function defaultProps(type: BlockType, defaults: BlockTextDefaults): BlockProps;
export function defaultProps(type: BlockType, defaults: BlockTextDefaults): BlockProps {
  // Registry lookup by a runtime type loses the per-type correlation TS could
  // otherwise check; the registry maps each key to its own definition, so the
  // localized cast is safe (and guarded by the factory/utils specs).
  return (BLOCK_DEFINITIONS[type].createDefaultProps as (defaults: BlockTextDefaults) => BlockProps)(defaults);
}

export function createBlock(type: BlockType, defaults: BlockTextDefaults): Block {
  return { id: uid(), type, props: defaultProps(type, defaults) } as Block;
}

/**
 * Deep-clones a block and regenerates every nested id (via the block's own
 * `cloneProps`). Required because tabs, grid items and cards each carry their
 * own `id` — sharing them between original and copy would confuse `@for`
 * tracking and let mutations on the duplicate leak into the original.
 */
export function cloneBlock(src: Block): Block {
  const cloned: Block = { ...structuredClone(src), id: uid() };
  const definition = BLOCK_DEFINITIONS[cloned.type];
  if (definition.cloneProps !== undefined) {
    // Same localized-cast rationale as in `defaultProps`.
    (cloned as { props: BlockProps }).props = (definition.cloneProps as (props: BlockProps) => BlockProps)(cloned.props);
  }
  return cloned;
}
