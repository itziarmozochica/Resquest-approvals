import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { FormatDatePipe } from '@fz-original/app/app/pipes/format-date.pipe';
import { DepositStatusBadgeComponent } from '@fz-original/app/modules/reservation/components/deposit-status-badge/deposit-status-badge.component';
import { NotesComponent } from '@fz-original/app/shared/components/notes/notes.component';
import { BookingTagsRowComponent } from '@fz-original/app/shared/tags/containers/booking-tags-row/booking-tags-row.component';
import { IgntAlertComponent, IgntTooltipDirective, MENU } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonDropdownComponent } from '@ignite/legacy/components/ignt-button-dropdown/ignt-button-dropdown.component';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntExpansionPanelComponent } from '@ignite/legacy/components/ignt-expansion-panel/ignt-expansion-panel.component';
import { IgntLinkComponent } from '@ignite/legacy/components/ignt-link/ignt-link.component';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ZXingScannerModule } from '@zxing/ngx-scanner';

import { PermissionBaseModule } from '../../directives/permission-based/permission-base.module';
import { IconsModule } from '../../icons/icons.module';
import { FilterDateRangeModule } from '../../layout/filters/date-range/date-range.module';
import { FiltersModule } from '../../layout/filters/filters.module';
import { TypeaheadModule } from '../../layout/filters/typeahead/typeahead.module';
import { ModalContentModule } from '../../layout/modal/modal-content.module';
import { PageTitleModule } from '../../layout/page-title/page-title.module';
import { PipesModule } from '../../pipes/pipes.module';
import { SearchBarModule } from '../../search-bar/search-bar.module';
import { CartHeaderComponent } from '../cart-header/cart-header.component';
import { SharedComponentsModule } from '../shared-components.module';
import { OrderAgreementsComponent } from './components/order-agreements/order-agreements.component';
import { OrderCancellationModalComponent } from './components/order-cancellation-modal/order-cancellation-modal.component';
import { OrderCardComponent } from './components/order-card/order-card.component';
import { OrderCoveredByFeverRefundComponent } from './components/order-covered-by-fever-refund/order-covered-by-fever-refund.component';
import { OrderDetailComponent } from './components/order-detail/order-detail.component';
import { OrderHeaderComponent } from './components/order-header/order-header.component';
import { OrderHistoryPanelComponent } from './components/order-history-panel/order-history-panel.component';
import { OrderJourneyComponent } from './components/order-journey/order-journey.component';
import { OrderPendingModificationComponent } from './components/order-pending-modification/order-pending-modification.component';
import { OrderPosTabsComponent } from './components/order-pos-tabs/order-pos-tabs.component';
import { OrderResponsesLinkComponent } from './components/order-responses-link/order-responses-link.component';
import { OrderSectionTileComponent } from './components/order-section-tile/order-section-tile.component';
import { OrderTaxDocumentEntriesComponent } from './components/order-tax-document-entries/order-tax-document-entries.component';
import { OrderTaxDocumentListComponent } from './components/order-tax-document-list/order-tax-document-list.component';
import { OrderTicketsWithCodesContentComponent } from './components/order-tickets/order-tickets-with-codes-content/order-tickets-with-codes-content.component';
import { OrderTicketsWithNoCodesContentComponent } from './components/order-tickets/order-tickets-with-no-codes-content/order-tickets-with-no-codes-content.component';
import { OrderTicketsComponent } from './components/order-tickets/order-tickets.component';
import { OrderTransactionHistoryComponent } from './components/order-transaction-history/order-transaction-history.component';
import { ValidatedCountComponent } from './components/validated-count/validated-count.component';
import { ValidationErrorComponent } from './components/validation-fail/validation-error.component';
import { ValidationHistoryComponent } from './components/validation-history/validation-history.component';
import { ValidationLabelComponent } from './components/validation-label/validation-label.component';
import { ValidationSuccessComponent } from './components/validation-success/validation-success.component';

@NgModule({
  declarations: [
    OrderCardComponent,
    OrderHeaderComponent,
    OrderDetailComponent,
    OrderTicketsComponent,
    OrderTicketsWithNoCodesContentComponent,
    OrderCancellationModalComponent,
    ValidatedCountComponent,
    ValidationLabelComponent,
    OrderTaxDocumentListComponent,
  ],
  exports: [
    OrderCardComponent,
    OrderHeaderComponent,
    OrderDetailComponent,
    OrderTicketsComponent,
    OrderTicketsWithCodesContentComponent,
    OrderTicketsWithNoCodesContentComponent,
    OrderCancellationModalComponent,
    ValidatedCountComponent,
    ValidationLabelComponent,
    ValidationSuccessComponent,
    ValidationErrorComponent,
    OrderTaxDocumentListComponent,
  ],
  imports: [
    BookingTagsRowComponent,
    OrderJourneyComponent,
    OrderPendingModificationComponent,
    OrderAgreementsComponent,
    OrderCoveredByFeverRefundComponent,
    IconsModule,
    OrderResponsesLinkComponent,
    TranslateModule,
    FilterDateRangeModule,
    PageTitleModule,
    CommonModule,
    PipesModule,
    ...MENU,
    NgbNavModule,
    SearchBarModule,
    TypeaheadModule,
    FiltersModule,
    ReactiveFormsModule,
    ZXingScannerModule,
    ModalContentModule,
    SharedComponentsModule,
    FormsModule,
    PermissionBaseModule,
    NgTemplateOutlet,
    IgntTooltipDirective,
    ValidationErrorComponent,
    ValidationHistoryComponent,
    ValidationSuccessComponent,
    CartHeaderComponent,
    IgntTagComponent,
    IgntButtonComponent,
    IgntButtonDropdownComponent,
    IgntAlertComponent,
    IgntWrapperCardComponent,
    IgntLinkComponent,
    IgntExpansionPanelComponent,
    IgntIconComponent,
    IgntTabsComponent,
    IgntTabsItemComponent,
    OrderSectionTileComponent,
    OrderTaxDocumentEntriesComponent,
    FormatDatePipe,
    NotesComponent,
    OrderTicketsWithCodesContentComponent,
    OrderHistoryPanelComponent,
    DepositStatusBadgeComponent,
    OrderPosTabsComponent,
    OrderTransactionHistoryComponent,
  ],
})
export class OrderCommonModule {}
