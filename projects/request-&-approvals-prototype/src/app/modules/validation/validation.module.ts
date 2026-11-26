import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { HelpTopicBannerComponent } from '@fz-original/app/shared/components/help-topic-banner/help-topic-banner.component';
import { HideWrapperOnHelpTopicCloseDirective } from '@fz-original/app/shared/directives/hide-wrapper-on-help-topic-close/hide-wrapper-on-help-topic-close.directive';
import { IgntDialogModule } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { OrderCommonModule } from '../../shared/components/order/order-common.module';
import { OrdersCommonModule } from '../../shared/components/orders/orders-common.module';
import { SharedComponentsModule } from '../../shared/components/shared-components.module';
import { PermissionBaseModule } from '../../shared/directives/permission-based/permission-base.module';
import { FiltersModule } from '../../shared/layout/filters/filters.module';
import { ModalContentModule } from '../../shared/layout/modal/modal-content.module';
import { PageTitleModule } from '../../shared/layout/page-title/page-title.module';
import { PipesModule } from '../../shared/pipes/pipes.module';
import { BoxOfficePurchaseConfirmationResendService } from '../../shared/services/order/purchase-confirmation-resend/box-office-purchase-confirmation-resend.service';
import { PURCHASE_CONFIRMATION_RESEND_SERVICE } from '../../shared/services/order/purchase-confirmation-resend/purchase-confirmation-resend.token';
import { OnsiteSetupModalModule } from '../box-office/ticketing/components/onsite-setup-modal/onsite-setup-modal.module';
import { ScannerViewComponent } from './components/scanner/scanner-view/scanner-view.component';
import { ScannerComponent } from './components/scanner/scanner.component';
import { ValidationEmptyFiltersPlaceholderComponent } from './components/validation-empty-filters-placeholder/validation-empty-filters-placeholder.component';
import { ValidationLegacyOrdersListComponent } from './components/validation-legacy-orders-list/validation-legacy-orders-list.component';
import { ValidationLoadingSpinnerComponent } from './components/validation-loading-spinner/validation-loading-spinner.component';
import { ValidationSearchBarComponent } from './components/validation-search-bar/validation-search-bar.component';
import { ValidationSummaryListSessionComponent } from './components/validation-summary-list-session/validation-summary-list-session.component';
import { ValidationSummaryOrderDetailComponent } from './components/validation-summary-order-detail/validation-summary-order-detail.component';
import { ValidationComponent } from './components/validation/validation.component';
import { validationTrackingProvider } from './tracking/validation.tracking-provider';
import { ValidationRoutingModule } from './validation-routing.module';

@NgModule({
  declarations: [ValidationComponent, ScannerComponent],
  imports: [
    CommonModule,
    ValidationRoutingModule,
    TranslateModule,
    PageTitleModule,
    FiltersModule,
    ReactiveFormsModule,
    ModalContentModule,
    PipesModule,
    SharedComponentsModule,
    PermissionBaseModule,
    OrderCommonModule,
    OrdersCommonModule,
    OnsiteSetupModalModule,
    HelpTopicBannerComponent,
    HideWrapperOnHelpTopicCloseDirective,
    IgntDialogModule,
    IgntIconComponent,
    ScannerViewComponent,
    ValidationEmptyFiltersPlaceholderComponent,
    ValidationLegacyOrdersListComponent,
    ValidationLoadingSpinnerComponent,
    ValidationSearchBarComponent,
    ValidationSummaryListSessionComponent,
    ValidationSummaryOrderDetailComponent,
  ],
  providers: [
    {
      provide: PURCHASE_CONFIRMATION_RESEND_SERVICE,
      useClass: BoxOfficePurchaseConfirmationResendService,
    },
    ...validationTrackingProvider(),
  ],
})
export class ValidationModule {}
