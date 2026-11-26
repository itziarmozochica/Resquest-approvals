import { Injectable } from '@angular/core';

import { EMPTY_TEXT_DEFAULTS } from '../blocks/_shared/block-text-defaults';
import { Block, BlockType } from '../models/block.model';
import { createBlock } from '../utils/block.utils';

/**
 * Production façade over the pure block factory: supplies the all-empty
 * `BlockTextDefaults` set so freshly-created blocks never persist stub copy
 * (the editor surfaces render localised placeholder hints over empty values
 * instead — see `EMPTY_TEXT_DEFAULTS`).
 *
 * Per-item factories (`createDefaultInfoCard`, `createDefaultTab`) are NOT
 * exposed here on purpose: they are each block's own responsibility — the
 * info-card/tabs properties sections import them from their block folder.
 */
@Injectable({ providedIn: 'root' })
export class BlockDefaultsFactory {
  createBlock(type: BlockType): Block {
    return createBlock(type, EMPTY_TEXT_DEFAULTS);
  }
}
