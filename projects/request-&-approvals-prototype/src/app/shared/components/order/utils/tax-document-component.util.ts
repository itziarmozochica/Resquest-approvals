import { TaxDocument, TaxDocumentComponentEnum } from '../../../models/tax-document/tax-document.model';

export function isSingleComponentTaxDocument(taxDocument: TaxDocument): boolean {
  return taxDocument.component === TaxDocumentComponentEnum.TICKET || taxDocument.component === TaxDocumentComponentEnum.SURCHARGE;
}
