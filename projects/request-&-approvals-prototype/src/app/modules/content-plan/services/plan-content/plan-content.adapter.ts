import { inject, Injectable } from '@angular/core';

import { SanitizeService } from '@fz-original/app/app/services/sanitize/sanitize.service';

import { PlanContent, PlanContentDTO } from '../../models/plan-content';
import { ContentSchemaAdapter } from '../content-schema/content-schema.adapter';

@Injectable({
  providedIn: 'root',
})
export class PlanContentAdapter {
  readonly #sanitizerService = inject(SanitizeService);
  readonly #contentSchemaAdapter = inject(ContentSchemaAdapter);

  toApi({ name, description, shortDescription, contentSchema, hasComponentsDescription, channelId }: PlanContent): PlanContentDTO {
    const sanitizedDescriptionObject: Pick<PlanContentDTO, 'plan_description'> =
      hasComponentsDescription === true ? {} : description ? { plan_description: this.sanitizeContent(description) } : {};

    // Deliberately not gated on `hasComponentsDescription`: block edits made while it was on must still reach the API.
    const contentSchemaDto: Pick<PlanContentDTO, 'content_schema'> =
      contentSchema !== undefined
        ? {
            content_schema: {
              channel_id: channelId !== null && channelId !== undefined && channelId !== '' ? channelId : null,
              structure: this.#contentSchemaAdapter.toApi(contentSchema),
            },
          }
        : {};

    return {
      ...(name ? { plan_name: name } : {}),
      ...(shortDescription ? { plan_short_description: shortDescription } : {}),
      ...sanitizedDescriptionObject,
      ...(hasComponentsDescription !== undefined ? { has_components_description: hasComponentsDescription } : {}),
      ...contentSchemaDto,
    };
  }

  private sanitizeContent(content: string): string {
    return this.#sanitizerService.sanitizeToString(content) ?? '';
  }
}
