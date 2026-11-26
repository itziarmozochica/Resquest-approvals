import { Pipe, PipeTransform } from '@angular/core';

import { IR_CATALOG_KEY_BY_TEXT } from '../models/ir-catalog-i18n';

/**
 * Resolves a snapshotted IR catalog form string (question label, section title, help text or
 * picklist option) to its `informationRequests.catalog.*` i18n key so it can be piped into
 * `| translate`. Unmapped text (partner custom fields) is returned unchanged, and `| translate`
 * then echoes it back. Usage: `{{ question.label | irCatalogKey | translate }}`.
 */
@Pipe({ name: 'irCatalogKey', standalone: true })
export class IrCatalogKeyPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    return IR_CATALOG_KEY_BY_TEXT[value.trim()] ?? value;
  }
}
