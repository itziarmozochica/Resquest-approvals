import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../models/base-response';
import { TaxDocument, TaxDocumentComponentEnum, TransactionReasonEnum } from '../../models/tax-document/tax-document.model';
import { TaxDocumentDTO } from './../../models/tax-document/tax-document.model';

type TaxDocumentAdapterResponse = BaseResponse<Array<TaxDocument>>;
type TaxDocumentDTOAdapterResponse = BaseResponse<Array<TaxDocumentDTO>>;

@Injectable({
  providedIn: 'root',
})
export class TaxDocumentAdapter implements AdapterInterface<TaxDocumentAdapterResponse, TaxDocumentDTOAdapterResponse> {
  fromApi(response: TaxDocumentDTOAdapterResponse): TaxDocumentAdapterResponse {
    return new BaseResponse<Array<TaxDocument>>(this.getData(response?.data), this.getError(response?.error));
  }

  private getError(data: BaseErrorResponse) {
    if (!data) {
      return null;
    }

    return { code: data.code, message: `errors.${data.code}` };
  }

  private getData(data: Array<TaxDocumentDTO> | null | undefined): Array<TaxDocument> | null {
    if (!data) {
      return null;
    }

    return data.map(taxDocument => ({
      id: taxDocument.simplified_bill_id,
      supplierBusinessName: taxDocument.supplier_business_name,
      supplierTaxId: taxDocument.supplier_tax_id,
      fileUrl: taxDocument.file_url,
      transactionReason: taxDocument.transaction_reason as TransactionReasonEnum,
      component: taxDocument.component ? (taxDocument.component as TaxDocumentComponentEnum) : undefined,
      isFullInvoice: taxDocument.is_full_invoice === true,
    }));
  }
}
