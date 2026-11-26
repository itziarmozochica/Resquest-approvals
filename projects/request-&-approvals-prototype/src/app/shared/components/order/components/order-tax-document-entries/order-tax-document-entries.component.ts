import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { PermissionBaseModule } from '@fz-original/app/shared/directives/permission-based/permission-base.module';
import { TaxDocument, TransactionReasonEnum } from '@fz-original/app/shared/models/tax-document/tax-document.model';
import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { isSingleComponentTaxDocument } from '../../utils/tax-document-component.util';
import { NominativeRequestStatus } from '../order-tax-document-list/nominative-request-status.enum';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, IgntButtonComponent, IgntIconComponent, PermissionBaseModule, TranslateModule],
  selector: 'app-order-tax-document-entries',
  styleUrl: './order-tax-document-entries.component.scss',
  templateUrl: './order-tax-document-entries.component.html',
})
export class OrderTaxDocumentEntriesComponent {
  readonly fullInvoiceRequestAllowed = input(false);
  readonly hasError = input(false);
  readonly requestButtonLabelKey = input('invoicing.fullInvoice.buttons.request');
  readonly requestStatus = input<NominativeRequestStatus>(NominativeRequestStatus.None);
  readonly showComponentLabels = input(false);
  readonly taxDocuments = input<Array<TaxDocument> | null>(null);

  readonly download = output<TaxDocument>();
  readonly requestFullInvoice = output<void>();

  protected readonly nominativeRequestStatus = NominativeRequestStatus;
  protected readonly rows = computed(() =>
    (this.taxDocuments() ?? []).map(taxDocument => ({
      labelKey:
        taxDocument.isFullInvoice && taxDocument.transactionReason === TransactionReasonEnum.PURCHASE
          ? 'invoicing.fullInvoice.label'
          : `validateTicketsNew.orderTaxDocumentList.transactionReason.${taxDocument.transactionReason}`,
      showComponent: this.showComponentLabels() && isSingleComponentTaxDocument(taxDocument),
      taxDocument,
    })),
  );
  protected readonly showFullInvoiceRequest = computed(() => {
    const taxDocuments = this.taxDocuments();
    return (
      taxDocuments !== null &&
      this.fullInvoiceRequestAllowed() &&
      (taxDocuments.length > 0 || this.requestStatus() === NominativeRequestStatus.Failed)
    );
  });
}
