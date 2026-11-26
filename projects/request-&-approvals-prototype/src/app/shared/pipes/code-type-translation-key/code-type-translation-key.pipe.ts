import { Pipe, PipeTransform } from '@angular/core';

import { CodeType } from '../../models/order/code-type.model';

const codeTypeTranslationKeyMap: Record<string, string> = {
  [CodeType.BARCODE]: 'validateTicketsNew.tickets.barcode',
  [CodeType.NO_IMAGE]: 'validateTicketsNew.tickets.QR',
  [CodeType.QR]: 'validateTicketsNew.tickets.QR',
};

const fallbackTranslationKey = 'validateTicketsNew.tickets.QR';

@Pipe({
  name: 'codeTypeTranslationKey',
  standalone: true,
})
export class CodeTypeTranslationKeyPipe implements PipeTransform {
  transform(codeType: string): string {
    return codeTypeTranslationKeyMap[codeType.toLowerCase()] ?? fallbackTranslationKey;
  }
}
