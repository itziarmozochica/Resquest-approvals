import { DialogModule } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { FilterProductSessionsPipe } from '@fz-original/app/modules/box-office/ticketing/filter-product-sessions.pipe';
import { OrderFiltersPanelComponent } from '@fz-original/app/modules/orders/components/order-filters-panel/order-filters-panel.component';
import { CouponCodeSelectorComponent } from '@fz-original/app/shared/components/coupon-code-selector/coupon-code-selector.component';
import { CouponModule } from '@fz-original/app/shared/components/coupon/coupon.module';
import { EventSelectionBandComponent } from '@fz-original/app/shared/components/event-selection-band/event-selection-band.component';
import { HelpTopicBannerComponent } from '@fz-original/app/shared/components/help-topic-banner/help-topic-banner.component';
import { HideWrapperOnHelpTopicCloseDirective } from '@fz-original/app/shared/directives/hide-wrapper-on-help-topic-close/hide-wrapper-on-help-topic-close.directive';
import { TrackViewDirective } from '@fz/fz-tracking/src/public-api';
import {
  IgntAccordionComponent,
  IgntAccordionItemComponent,
  IgntAlertComponent,
  IgntButtonComponent as IgntCommonButtonComponent,
  IgntTooltipDirective,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntExpansionPanelComponent } from '@ignite/legacy/components/ignt-expansion-panel/ignt-expansion-panel.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { IgntRadioGroupComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio-group.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

import { ContactInformationComponent } from '../../shared/components/contact-information/contact-information.component';
import { MessageModalComponent } from '../../shared/components/message-modal/message-modal.component';
import { OrdersCommonModule } from '../../shared/components/orders/orders-common.module';
import { PlanDetailCardComponent } from '../../shared/components/plan-detail-card/plan-detail-card.component';
import { SharedComponentsModule } from '../../shared/components/shared-components.module';
import { TicketSelectorOboComponent } from '../../shared/components/ticket-selector-obo/ticket-selector-obo.component';
import { TicketSelectorComponent } from '../../shared/components/ticket-selector/ticket-selector.component';
import { AutoformatNumericInputModule } from '../../shared/directives/autoformat-numeric-input/autoformat-numeric-input.module';
import { IFrameResizerModule } from '../../shared/directives/iframe-resizer/iframe-resizer.module';
import { InfiniteScrollLoaderDirective } from '../../shared/directives/infinite-scroll-loader/infinite-scroll-loader.directive';
import { InputMobileBehaviorModule } from '../../shared/directives/input-mobile-behavior/input-mobile-behavior.module';
import { IconsModule } from '../../shared/icons/icons.module';
import { FilterDateRangeModule } from '../../shared/layout/filters/date-range/date-range.module';
import { MultiSelectModule } from '../../shared/layout/filters/multi-select/multi-select.module';
import { FilterSelectModule } from '../../shared/layout/filters/select/select.module';
import { TypeaheadModule } from '../../shared/layout/filters/typeahead/typeahead.module';
import { ModalContentModule } from '../../shared/layout/modal/modal-content.module';
import { PageTitleModule } from '../../shared/layout/page-title/page-title.module';
import { OrderPaymentMethodLabelPipe } from '../../shared/pipes/order-payment-method-label/order-payment-method-label.pipe';
import { PipesModule } from '../../shared/pipes/pipes.module';
import { OrderResolver } from '../../shared/resolvers/order.resolver';
import { SearchBarModule } from '../../shared/search-bar/search-bar.module';
import { SeatingSelectorModule } from '../../shared/seating-selector/seating-selector.module';
import { ReceiptDocumentBannerComponent } from '../reservation/components/checkout/payment-method/receipt-document-banner/receipt-document-banner.component';
import { BoxOfficeRoutingModule } from './box-office-routing.module';
import { CheckoutResolver } from './checkout.resolver';
import { CheckoutComponent } from './checkout/checkout.component';
import { PaymentMethodComponent } from './checkout/components/payment-method/payment-method.component';
import { MembershipsIdentifyMemberButtonComponent } from './memberships/components/identify-member-button/identify-member-button.component';
import { OneStopShopComponent } from './one-stop-shop/containers/one-stop-shop.component';
import { OrderComponent } from './order/order.component';
import { PurchasedCartOrderComponent } from './purchased-cart/components/purchased-cart-order/purchased-cart-order.component';
import { PurchasedCartJourneyComponent } from './purchased-cart/containers/purchased-cart-journey/purchased-cart-journey.component';
import { PurchasedCartComponent } from './purchased-cart/purchased-cart.component';
import { SalesSummaryComponent } from './sales-summary/sales-summary.component';
import { CashRegisterCardComponent } from './settings/components/cash-register-card/cash-register-card.component';
import { CashRegisterFormComponent } from './settings/components/cash-register-form/cash-register-form.component';
import { ChipsInputComponent } from './settings/components/chips-input/chips-input.component';
import { OnsiteSetupFormComponent } from './settings/components/onsite-setup-form/onsite-setup-form.component';
import { PaymentConfigurationsListComponent } from './settings/containers/payment-configurations-list/payment-configurations-list.component';
import { OboSettingsComponent } from './settings/obo-settings.component';
import { SquareConnectionModalComponent } from './shared/components/square-connection-modal/square-connection-modal.component';
import { ShiftCashSummaryComponent } from './shift/components/shift-cash-summary/shift-cash-summary.component';
import { ShiftNotesComponent } from './shift/components/shift-notes/shift-notes.component';
import { ShiftPaymentsBreakdownComponent } from './shift/components/shift-payments-breakdown/shift-payments-breakdown.component';
import { ShiftSalesStatsComponent } from './shift/components/shift-sales-stats/shift-sales-stats.component';
import { ShiftSalesSummaryComponent } from './shift/components/shift-sales-summary/shift-sales-summary.component';
import { ShiftSurveysComponent } from './shift/components/shift-surveys/shift-surveys.component';
import { ShiftTransactionsTableComponent } from './shift/components/shift-transactions/shift-transactions-table/shift-transactions-table.component';
import { ShiftTransactionsComponent } from './shift/components/shift-transactions/shift-transactions.component';
import { ShiftComponent } from './shift/shift.component';
import { ShiftsListTableComponent } from './shifts-list/components/shifts-list-table/shifts-list-table.component';
import { ShiftsListComponent } from './shifts-list/shifts-list.component';
import { BoxOfficeTicketingComponent } from './ticketing/box-office-ticketing.component';
import { CashChangeCalculatorModalComponent } from './ticketing/components/cash-change-calculator-modal/cash-change-calculator-modal.component';
import { ConfirmModalComponent } from './ticketing/components/confirm-modal/confirm-modal.component';
import { OneStepCartFooterComponent } from './ticketing/components/one-step-cart-footer/one-step-cart-footer.component';
import { OneStepMultiCartComponent } from './ticketing/components/one-step-multi-cart/one-step-multi-cart.component';
import { OnsiteSetupModalModule } from './ticketing/components/onsite-setup-modal/onsite-setup-modal.module';
import { EndShiftModalComponent } from './ticketing/components/start-end-shift/end-shift-modal/end-shift-modal.component';
import { StartEndShiftComponent } from './ticketing/components/start-end-shift/start-end-shift.component';
import { StartShiftModalComponent } from './ticketing/components/start-end-shift/start-shift-modal/start-shift-modal.component';
import { TicketingWrapperComponent } from './ticketing/containers/ticketing-wrapper.component';

@NgModule({
  declarations: [
    TicketingWrapperComponent,
    BoxOfficeTicketingComponent,
    MessageModalComponent,
    CheckoutComponent,
    PaymentMethodComponent,
    PurchasedCartComponent,
    OrderComponent,
    SalesSummaryComponent,
    SquareConnectionModalComponent,
    StartShiftModalComponent,
    EndShiftModalComponent,
    ConfirmModalComponent,
    ShiftsListComponent,
    ShiftComponent,
    ShiftSalesSummaryComponent,
    ShiftCashSummaryComponent,
    ShiftTransactionsComponent,
    ShiftTransactionsTableComponent,
    OboSettingsComponent,
    CashRegisterFormComponent,
    CashRegisterCardComponent,
    CashChangeCalculatorModalComponent,
    ShiftSurveysComponent,
  ],
  imports: [
    IgntAlertComponent,
    EventSelectionBandComponent,
    IgntSkeletonBaseComponent,
    BoxOfficeRoutingModule,
    MembershipsIdentifyMemberButtonComponent,
    CommonModule,
    DialogModule,
    PageTitleModule,
    TranslateModule,
    PipesModule,
    IconsModule,
    SearchBarModule,
    ReactiveFormsModule,
    ModalContentModule,
    SharedComponentsModule,
    SeatingSelectorModule,
    IFrameResizerModule,
    OrdersCommonModule,
    OrderPaymentMethodLabelPipe,
    OrderFiltersPanelComponent,
    ContactInformationComponent,
    TypeaheadModule,
    CouponModule,
    FilterDateRangeModule,
    InfiniteScrollLoaderDirective,
    ShiftsListTableComponent,
    AutoformatNumericInputModule,
    FormsModule,
    MultiSelectModule,
    FilterSelectModule,
    ChipsInputComponent,
    InputMobileBehaviorModule,
    ReceiptDocumentBannerComponent,
    IgntButtonComponent,
    IgntIconComponent,
    IgntIconButtonComponent,
    IgntInputFieldComponent,
    OneStepCartFooterComponent,
    OneStepMultiCartComponent,
    OneStopShopComponent,
    ShiftNotesComponent,
    ShiftPaymentsBreakdownComponent,
    ShiftSalesStatsComponent,
    TicketSelectorComponent,
    TicketSelectorOboComponent,
    CouponCodeSelectorComponent,
    PlanDetailCardComponent,
    FilterProductSessionsPipe,
    HelpTopicBannerComponent,
    HideWrapperOnHelpTopicCloseDirective,
    IgntAccordionComponent,
    IgntAccordionItemComponent,
    IgntCommonButtonComponent,
    IgntExpansionPanelComponent,
    IgntTabsComponent,
    IgntTabsItemComponent,
    IgntWrapperCardComponent,
    IgntTagComponent,
    IgntToggleComponent,
    PurchasedCartOrderComponent,
    PurchasedCartJourneyComponent,
    IgntListItemComponent,
    IgntRadioGroupComponent,
    IgntRadioComponent,
    IgntTooltipDirective,
    OnsiteSetupFormComponent,
    OnsiteSetupModalModule,
    StartEndShiftComponent,
    TrackViewDirective,
    PaymentConfigurationsListComponent,
  ],
  providers: [CheckoutResolver, OrderResolver],
})
export class BoxOfficeModule {}
