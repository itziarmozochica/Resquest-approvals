import { DialogModule } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { KioskSuccessModalComponent } from '@fz-original/app/modules/kiosk/shared/components/modals/kiosk-success/kiosk-success-modal.component';
import { KioskTermsModalComponent } from '@fz-original/app/modules/kiosk/shared/components/modals/kiosk-terms/kiosk-terms-modal.component';
import { ContactPhoneFieldComponent } from '@fz-original/app/shared/components/contact-phone-field/contact-phone-field.component';
import { IsAddonWithoutEntryTicketsSelectedPipe } from '@fz-original/app/shared/pipes/is-add-on-without-entry-ticket-selected/is-add-on-without-entry-tickets-selected.pipe';
import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';
import { IgntSkeletonComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton/ignt-skeleton.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';

import { BookingQuestionsFormGroupModule } from '../../shared/booking-questions/modules/form-group/form-group.module';
import { ContactInformationComponent } from '../../shared/components/contact-information/contact-information.component';
import { SharedComponentsModule } from '../../shared/components/shared-components.module';
import { MultiSelectModule } from '../../shared/layout/filters/multi-select/multi-select.module';
import { ModalContentModule } from '../../shared/layout/modal/modal-content.module';
import { PageTitleModule } from '../../shared/layout/page-title/page-title.module';
import { PipesModule } from '../../shared/pipes/pipes.module';
import { SearchBarModule } from '../../shared/search-bar/search-bar.module';
import { SeatingSelectorModule } from '../../shared/seating-selector/seating-selector.module';
import { BookingQuestionsComponent } from './components/booking-questions/booking-questions.component';
import { KioskDateQuestionItemComponent } from './components/booking-questions/kiosk-date-question-item/kiosk-date-question-item.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { KioskHomeComponent } from './components/kiosk-home/kiosk-home.component';
import { KioskPlanDetailComponent } from './components/kiosk-plan-detail/kiosk-plan-detail.component';
import { KioskScreensaverComponent } from './components/kiosk-screensaver/kiosk-screensaver.component';
import { OrderConfirmationComponent } from './components/order-confirmation/order-confirmation.component';
import { PaymentComponent } from './components/payment/payment.component';
import { PromotionsComponent } from './components/promotions/promotions.component';
import { KioskTicketingComponent } from './components/ticketing/kiosk-ticketing.component';
import { KioskRoutingModule } from './kiosk-routing.module';
import { ActionFooterComponent } from './shared/components/action-footer/action-footer.component';
import { KioskButtonComponent } from './shared/components/button/kiosk-button.component';
import { CartItemComponent } from './shared/components/cart-item/cart-item.component';
import { CartModalComponent } from './shared/components/cart-modal/cart-modal.component';
import { ContactComponent } from './shared/components/contact/contact.component';
import { CoverImageComponent } from './shared/components/cover-image/cover-image.component';
import { DateSelectorKioskComponent } from './shared/components/date-selector-kiosk/date-selector-kiosk.component';
import { IconButtonComponent } from './shared/components/icon-button/icon-button.component';
import { KioskCategorySectionComponent } from './shared/components/kiosk-category-section/kiosk-category-section.component';
import { KioskCoverImageComponent } from './shared/components/kiosk-cover-image/kiosk-cover-image.component';
import { KioskHeroComponent } from './shared/components/kiosk-hero/kiosk-hero.component';
import { KioskKenBurnsSliderComponent } from './shared/components/kiosk-ken-burns-slider/kiosk-ken-burns-slider.component';
import { KioskPlanItemComponent } from './shared/components/kiosk-plan-item/kiosk-plan-item.component';
import { KioskPlansGridComponent } from './shared/components/kiosk-plans-grid/kiosk-plans-grid.component';
import { KioskTicketSelectorLevelComponent } from './shared/components/kiosk-ticket-selector-level/kiosk-ticket-selector-level.component';
import { LanguageToggleComponent } from './shared/components/language-toggle/language-toggle.component';
import { KioskAreYouThereModalComponent } from './shared/components/modals/kiosk-are-you-there/kiosk-are-you-there-modal.component';
import { KioskCancelPaymentModalComponent } from './shared/components/modals/kiosk-cancel-payment/kiosk-cancel-payment-modal.component';
import { KioskCancelModalComponent } from './shared/components/modals/kiosk-cancel/kiosk-cancel-modal.component';
import { KioskDatePickerModalComponent } from './shared/components/modals/kiosk-date-picker/kiosk-date-picker-modal.component';
import { KioskDiscardCartModalComponent } from './shared/components/modals/kiosk-discard-cart/kiosk-discard-cart-modal.component';
import { KioskEmailModalComponent } from './shared/components/modals/kiosk-email/kiosk-email-modal.component';
import { KioskErrorModalComponent } from './shared/components/modals/kiosk-error/kiosk-error-modal.component';
import { KioskPrintModalComponent } from './shared/components/modals/kiosk-print/kiosk-print-modal.component';
import { KioskPromotionsModalComponent } from './shared/components/modals/kiosk-promotions/kiosk-promotions-modal.component';
import { CodePromotionComponent } from './shared/components/modals/kiosk-promotions/ui/code-promotion/code-promotion.component';
import { GenericPromotionComponent } from './shared/components/modals/kiosk-promotions/ui/generic-promotion/generic-promotion.component';
import { InputPromotionComponent } from './shared/components/modals/kiosk-promotions/ui/input-promotion/input-promotion.component';
import { KioskQrModalComponent } from './shared/components/modals/kiosk-qr/kiosk-qr-modal.component';
import { KioskPlanCarouselRowComponent } from './shared/components/plan-carousel/kiosk-plan-carousel-row.component';
import { KioskPlanCarouselWrapperComponent } from './shared/components/plan-carousel/kiosk-plan-carousel-wrapper.component';
import { PurchaseDetailsComponent } from './shared/components/purchase-details/purchase-details.component';
import { KioskTicketSelectorComponent } from './shared/components/ticket-selector/kiosk-ticket-selector.component';
import { ToolbarButtonComponent } from './shared/components/toolbar-button/toolbar-button.component';
import { KioskImageDirective } from './shared/directives/kiosk-image/kiosk-image.directive';
import { LongPressDirective } from './shared/directives/long-press/long-press.directive';
import { KioskCurrencyPipe } from './shared/pipes/kiosk-currency.pipe';

@NgModule({
  declarations: [
    KioskTicketingComponent,
    OrderConfirmationComponent,
    KioskHomeComponent,
    CartModalComponent,
    CoverImageComponent,
    KioskCoverImageComponent,
    KioskKenBurnsSliderComponent,
    KioskPlanCarouselWrapperComponent,
    KioskPlanDetailComponent,
    DateSelectorKioskComponent,
    ContactComponent,
    CheckoutComponent,
    KioskTicketSelectorComponent,
    PaymentComponent,
    PromotionsComponent,
    PurchaseDetailsComponent,
    CartItemComponent,
    BookingQuestionsComponent,
    KioskQrModalComponent,
    KioskAreYouThereModalComponent,
    KioskPrintModalComponent,
    KioskEmailModalComponent,
    KioskCancelModalComponent,
    KioskErrorModalComponent,
    KioskTicketSelectorLevelComponent,
    KioskCancelPaymentModalComponent,
    KioskDiscardCartModalComponent,
    KioskSuccessModalComponent,
    KioskPromotionsModalComponent,
    CodePromotionComponent,
    GenericPromotionComponent,
    InputPromotionComponent,
  ],
  imports: [
    IgntAlertComponent,
    IgntButtonComponent,
    CommonModule,
    DialogModule,
    PageTitleModule,
    KioskRoutingModule,
    TranslateModule,
    PipesModule,
    IgntIconComponent,
    ReactiveFormsModule,
    ModalContentModule,
    SharedComponentsModule,
    SeatingSelectorModule,
    SearchBarModule,
    ContactInformationComponent,
    KioskCategorySectionComponent,
    KioskHeroComponent,
    KioskPlanCarouselRowComponent,
    KioskPlansGridComponent,
    ToolbarButtonComponent,
    MultiSelectModule,
    BookingQuestionsFormGroupModule,
    FormsModule,
    IgntInputFieldComponent,
    ContactPhoneFieldComponent,
    IgntIconComponent,
    IgntTagComponent,
    IgntSkeletonComponent,
    IgntSkeletonBaseComponent,
    KioskPlanItemComponent,
    IsAddonWithoutEntryTicketsSelectedPipe,
    IconButtonComponent,
    LanguageToggleComponent,
    ActionFooterComponent,
    KioskButtonComponent,
    KioskScreensaverComponent,
    KioskImageDirective,
    LongPressDirective,
    KioskDatePickerModalComponent,
    KioskDateQuestionItemComponent,
    KioskTermsModalComponent,
    KioskCurrencyPipe,
  ],
})
export class KioskModule {}
