import { Injectable } from '@angular/core';

import { asNonEmptyString, isRecord } from '../../components/plan-edition/description-builder/blocks/_shared/dto-codec.util';
import { uid } from '../../components/plan-edition/description-builder/blocks/_shared/uid.util';
import { BLOCK_DEFINITION_BY_DTO_TYPE, BLOCK_DEFINITIONS } from '../../components/plan-edition/description-builder/blocks/block-registry';
import { BlockDTO, BlockTypeDTO } from '../../components/plan-edition/description-builder/models/block.dto';
import { Block, BlockProps } from '../../components/plan-edition/description-builder/models/block.model';

/**
 * Maps the content schema between the wire shape and the domain models through
 * each block type's own codec. Defensive when reading: unknown types are dropped,
 * missing fields fall back to neutral defaults, missing ids are regenerated.
 */
@Injectable({ providedIn: 'root' })
export class ContentSchemaAdapter {
  fromApi(raw: unknown): Block[] {
    if (!Array.isArray(raw)) return [];
    const blocks: Block[] = [];
    for (const entry of raw) {
      const block = this.#blockFromApi(entry);
      if (block !== null) blocks.push(block);
    }
    return blocks;
  }

  toApi(blocks: Block[]): BlockDTO[] {
    return blocks.map(block => this.#blockToApi(block));
  }

  #blockFromApi(raw: unknown): Block | null {
    if (!isRecord(raw)) return null;
    const dtoType = raw['type'];
    if (typeof dtoType !== 'string' || !(dtoType in BLOCK_DEFINITION_BY_DTO_TYPE)) return null;
    const definition = BLOCK_DEFINITION_BY_DTO_TYPE[dtoType as BlockTypeDTO];
    const id = asNonEmptyString(raw['id'], uid);
    const props = isRecord(raw['props']) ? raw['props'] : {};
    return { id, type: definition.type, props: definition.fromDto(props) } as Block;
  }

  #blockToApi(block: Block): BlockDTO {
    const definition = BLOCK_DEFINITIONS[block.type];
    const props = (definition.toDto as (props: BlockProps) => BlockDTO['props'])(block.props);
    return { id: block.id, type: definition.dtoType, props } as BlockDTO;
  }
}
