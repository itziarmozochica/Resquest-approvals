import { Injectable } from '@angular/core';

import { PlanMetadata, PlanMetadataData, UpdatePlanMetadata, UpdatePlanMetadataData } from '../../models/plan-metadata.model';
import { toNullableInteger } from '../../utils/nullable-integer.util';

@Injectable({
  providedIn: 'root',
})
export class PlanMetadataAdapter {
  fromApi(data: PlanMetadataData): PlanMetadata {
    return {
      composerId: toNullableInteger(data.composer_id),
      composerName: this.#toNullableText(data.composer_name),
      ensemble: this.#toNullableText(data.ensemble),
      instrumentation: this.#toNullableText(data.instrumentation),
      musicGenre: toNullableInteger(data.music_genre),
      programId: toNullableInteger(data.program_id),
      setlist: this.#toNullableText(data.setlist),
    };
  }

  toApi(data: UpdatePlanMetadata): UpdatePlanMetadataData {
    return {
      composer_id: data.composerId,
      composer_name: data.composerName,
      ensemble: data.ensemble,
      instrumentation: data.instrumentation,
      music_genre: data.musicGenre,
      program_id: data.programId,
      setlist: data.setlist,
    };
  }

  #toNullableText(value: string | null | undefined): string | null {
    return value === undefined || value === null || value === '' ? null : value;
  }
}
