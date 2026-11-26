import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { OrderDownloadOptionsModalComponent } from '@fz-original/app/shared/components/orders/components/order-download-options-modal/order-download-options-modal.component';
import { ModalContentModule } from '@fz-original/app/shared/layout/modal/modal-content.module';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';

import { FilterDateRangeModule } from '../../layout/filters/date-range/date-range.module';
import { IgntTypeaheadModule } from '../../layout/filters/ignt-typeahead/ignt-typeahead.module';
import { OrderPaymentMethodLabelPipe } from '../../pipes/order-payment-method-label/order-payment-method-label.pipe';
import { PipesModule } from '../../pipes/pipes.module';
import { OrderTableComponent } from './components/order-table/order-table.component';

@NgModule({
  declarations: [OrderTableComponent, OrderDownloadOptionsModalComponent],
  exports: [OrderTableComponent],
  imports: [
    CommonModule,
    FilterDateRangeModule,
    IgntTypeaheadModule,
    TranslateModule,
    PipesModule,
    RouterModule,
    FormsModule,
    ModalContentModule,
    IgntButtonComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    FontAwesomeModule,
    OrderPaymentMethodLabelPipe,
  ],
})
export class OrdersCommonModule {}
