import { CommonModule, DatePipe, NgOptimizedImage } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ContactPhoneComponent } from '@fz-original/app/shared/components/contact-phone/contact-phone.component';
import { GenericTableComponent } from '@fz-original/app/shared/components/generic-table/generic-table.component';
import { IgntAlertComponent, IgntButtonComponent as IgntCommonButtonComponent, IgntTooltipDirective, MENU } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntDatePickerInputComponent } from '@ignite/legacy/components/ignt-date-picker-input/ignt-date-picker-input.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntLinkComponent } from '@ignite/legacy/components/ignt-link/ignt-link.component';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';
import { IgntSkeletonComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton/ignt-skeleton.component';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';

import { TelTypeModule } from '../booking-questions/modules/form-group/tel-type/tel-type.module';
import { CartAdjustmentPriceComponent } from '../cart/components/cart-adjustment-price/cart-adjustment-price.component';
import { CartEstimatedEndTimeComponent } from '../cart/components/cart-estimated-end-time/cart-estimated-end-time.component';
import { CartLinePriceEditorComponent } from '../cart/components/cart-line-price-editor/cart-line-price-editor.component';
import { AutoformatNumericInputModule } from '../directives/autoformat-numeric-input/autoformat-numeric-input.module';
import { InfiniteScrollLoaderDirective } from '../directives/infinite-scroll-loader/infinite-scroll-loader.directive';
import { InputMobileBehaviorModule } from '../directives/input-mobile-behavior/input-mobile-behavior.module';
import { IconsModule } from '../icons/icons.module';
import { ModalContentModule } from '../layout/modal/modal-content.module';
import { OrderPaymentMethodLabelPipe } from '../pipes/order-payment-method-label/order-payment-method-label.pipe';
import { PipesModule } from '../pipes/pipes.module';
import { BottomSliderComponent } from './bottom-slider/bottom-slider.component';
import { CartDetailOboComponent } from './cart-detail-obo/cart-detail-obo.component';
import { CartDetailComponent } from './cart-detail/cart-detail.component';
import { CashChangeCalculatorComponent } from './cash-change-calculator/cash-change-calculator.component';
import { ContactsInputComponent } from './contacts-input/contacts-input.component';
import { CountryCodeSelectorComponent } from './country-code-selector/country-code-selector.component';
import { CouponCartCardComponent } from './coupon-cart-card/coupon-cart-card.component';
import { CouponCodeComponent } from './coupon-code/coupon-code.component';
import { DateSelectorOboComponent } from './date-selector-obo/date-selector-obo.component';
import { DateSelectorComponent } from './date-selector/date-selector.component';
import { DateTimeFormControlComponent } from './date-time-form-control/date-time-form-control.component';
import { DynamicFormComponent } from './dynamic-form/dynamic-form.component';
import { ExportListButtonComponent } from './export-list-button/export-list-button.component';
import { LateralSliderComponent } from './lateral-slider/lateral-slider.component';
import { MessageBannerWithButtonComponent } from './message-banner-with-button/message-banner-with-button.component';
import { OnsiteSetupCardComponent } from './onsite-setup/onsite-setup-card/onsite-setup-card.component';
import { OrderDetailComponent } from './order-details/order-detail.component';
import { PaginatedTableContainerComponent } from './paginated-table-container/paginated-table-container.component';
import { PlanInfoCellComponent } from './plan-table/plan-table-row/plan-table-cell/plan-info-cell/plan-info-cell.component';
import { PlanStateCellComponent } from './plan-table/plan-table-row/plan-table-cell/plan-state-cell/plan-state-cell.component';
import { PlanTrackingLinkCellComponent } from './plan-table/plan-table-row/plan-table-cell/plan-tracking-link-cell/plan-tracking-link-cell.component';
import { SeatingModalComponent } from './seating-modal/seating-modal.component';
import { KenBurnsSliderComponent } from './sliders/ken-burns-slider/ken-burns-slider.component';
import { MosaicSliderComponent } from './sliders/mosaic-slider/mosaic-slider.component';
import { SpinnerModalComponent } from './spinner-modal/spinner-modal.component';
import { TableComponent, TableOrderByIconPipe, TableOrderBySelectedPipe } from './table/table.component';
import { PlanStatusTagComponent } from './tag/plan-status-tag.component';
import { TicketQRComponent } from './ticket-qr/ticket-qr.component';
import { TicketSelectorLevelOboComponent } from './ticket-selector-level-obo/ticket-selector-level-obo.component';
import { TicketSelectorLevelComponent } from './ticket-selector-level/ticket-selector-level.component';
import { TicketSelectorOboComponent } from './ticket-selector-obo/ticket-selector-obo.component';
import { TicketSelectorComponent } from './ticket-selector/ticket-selector.component';
import { UnpaginatedTableContainerComponent } from './unpaginated-table-container/unpaginated-table-container.component';
import { ValidationErrorMessagesComponent } from './validation-error-messages/validation-error-messages.component';

@NgModule({
  imports: [
    PipesModule,
    CommonModule,
    TranslateModule,
    IconsModule,
    ReactiveFormsModule,
    ModalContentModule,
    ...MENU,
    IgntIconComponent,
    IgntTooltipDirective,
    FormsModule,
    RouterLink,
    InfiniteScrollLoaderDirective,
    AutoformatNumericInputModule,
    IgntAlertComponent,
    IgntDatePickerInputComponent,
    InputMobileBehaviorModule,
    NgOptimizedImage,
    IgntTagComponent,
    IgntLinkComponent,
    TicketSelectorComponent,
    TicketSelectorLevelComponent,
    TicketSelectorLevelOboComponent,
    TicketSelectorOboComponent,
    IgntButtonComponent,
    IgntCommonButtonComponent,
    IgntIconButtonComponent,
    IgntTabsComponent,
    IgntTabsItemComponent,
    CartAdjustmentPriceComponent,
    CartLinePriceEditorComponent,
    CartEstimatedEndTimeComponent,
    PlanStatusTagComponent,
    IgntSkeletonComponent,
    CashChangeCalculatorComponent,
    OrderPaymentMethodLabelPipe,
    IgntInputFieldComponent,
    TelTypeModule,
    ContactPhoneComponent,
    IgntSkeletonBaseComponent,
    CouponCartCardComponent,
    DynamicFormComponent,
    GenericTableComponent,
    OnsiteSetupCardComponent,
  ],
  declarations: [
    DateSelectorComponent,
    DateSelectorOboComponent,
    BottomSliderComponent,
    LateralSliderComponent,
    CartDetailComponent,
    TicketQRComponent,
    CartDetailOboComponent,
    SeatingModalComponent,
    ValidationErrorMessagesComponent,
    ExportListButtonComponent,
    TableComponent,
    OrderDetailComponent,
    MessageBannerWithButtonComponent,
    SpinnerModalComponent,
    PaginatedTableContainerComponent,
    DateTimeFormControlComponent,
    CountryCodeSelectorComponent,
    CouponCodeComponent,
    PlanInfoCellComponent,
    PlanStateCellComponent,
    PlanTrackingLinkCellComponent,
    TableOrderByIconPipe,
    TableOrderBySelectedPipe,
    UnpaginatedTableContainerComponent,
    KenBurnsSliderComponent,
    MosaicSliderComponent,
    ContactsInputComponent,
  ],
  providers: [DatePipe],
  exports: [
    TicketSelectorOboComponent,
    DateSelectorComponent,
    DateSelectorOboComponent,
    BottomSliderComponent,
    LateralSliderComponent,
    CartDetailComponent,
    TicketQRComponent,
    CartDetailOboComponent,
    ValidationErrorMessagesComponent,
    ExportListButtonComponent,
    PlanStatusTagComponent,
    TableComponent,
    OrderDetailComponent,
    MessageBannerWithButtonComponent,
    SpinnerModalComponent,
    PaginatedTableContainerComponent,
    DateTimeFormControlComponent,
    CountryCodeSelectorComponent,
    CouponCodeComponent,
    DynamicFormComponent,
    PlanInfoCellComponent,
    PlanStateCellComponent,
    PlanTrackingLinkCellComponent,
    CashChangeCalculatorComponent,
    OnsiteSetupCardComponent,
    UnpaginatedTableContainerComponent,
    KenBurnsSliderComponent,
    MosaicSliderComponent,
    ContactsInputComponent,
    GenericTableComponent,
    IconsModule,
  ],
})
export class SharedComponentsModule {}
