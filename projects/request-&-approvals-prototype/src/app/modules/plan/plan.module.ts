import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { AmbassadorOverviewComponent } from '@fz-original/app/modules/plan/reseller-list-plan/ambassador-overview/ambassador-overview.component';
import { HelpTopicBannerComponent } from '@fz-original/app/shared/components/help-topic-banner/help-topic-banner.component';
import { HideWrapperOnHelpTopicCloseDirective } from '@fz-original/app/shared/directives/hide-wrapper-on-help-topic-close/hide-wrapper-on-help-topic-close.directive';
import { IgntAlertComponent, IgntButtonComponent as IgntCommonButtonComponent, MENU } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntExpansionPanelComponent } from '@ignite/legacy/components/ignt-expansion-panel/ignt-expansion-panel.component';
import { IgntLinkComponent } from '@ignite/legacy/components/ignt-link/ignt-link.component';
import { IgntSkeletonComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton/ignt-skeleton.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ClipboardModule } from 'ngx-clipboard';

import { EventSelectionBandComponent } from '../../shared/components/event-selection-band/event-selection-band.component';
import { OrganizationDashboardComponent } from '../../shared/components/organization-dashboard/organization-dashboard.component';
import { SharedComponentsModule } from '../../shared/components/shared-components.module';
import { PlanStatusTagComponent } from '../../shared/components/tag/plan-status-tag.component';
import { IFrameResizerModule } from '../../shared/directives/iframe-resizer/iframe-resizer.module';
import { PermissionBaseModule } from '../../shared/directives/permission-based/permission-base.module';
import { IconsModule } from '../../shared/icons/icons.module';
import { DateSelectorExtendedModule } from '../../shared/layout/filters/date-selector-extended/date-selector-extended.module';
import { FiltersModule } from '../../shared/layout/filters/filters.module';
import { GoBackModule } from '../../shared/layout/go-back/go-back.module';
import { HelpPopoverModule } from '../../shared/layout/help-popover/help-popover.module';
import { InlineLoaderModule } from '../../shared/layout/inline-loader/inline-loader.module';
import { ModalContentModule } from '../../shared/layout/modal/modal-content.module';
import { PageTitleModule } from '../../shared/layout/page-title/page-title.module';
import { OptimizelyModule } from '../../shared/optimizely/optimizely.module';
import { PipesModule } from '../../shared/pipes/pipes.module';
import { SearchBarModule } from '../../shared/search-bar/search-bar.module';
import { FzAssistantHostDirective } from '../../shared/services/fz-assistant/host/fz-assistant-host.directive';
import { CreateEventModalComponent } from './list-plan/components/create-event-modal/create-event-modal.component';
import { CreateEventStickyBarComponent } from './list-plan/components/create-event-sticky-bar/create-event-sticky-bar.component';
import { PlanCardComponent } from './list-plan/components/plan-card/plan-card.component';
import { ShareModalComponent } from './list-plan/components/share-modal/share-modal.component';
import { ListPlanHeaderComponent } from './list-plan/containers/list-plan-header/list-plan-header.component';
import { PlansAggregatesKpiBarComponent } from './list-plan/containers/plans-aggregates-kpi-bar/plans-aggregates-kpi-bar.component';
import { ListPlanComponent } from './list-plan/list-plan.component';
import { DuplicatePlanModalComponent } from './plan-request-management/duplicate-plan-modal/duplicate-plan-modal.component';
import { PlanRequestManagementComponent } from './plan-request-management/plan-request-management.component';
import { PhotosComponent } from './plan-request/components/photos/photos.component';
import { PlanSetupComponent } from './plan-request/components/plan-setup/plan-setup.component';
import { ReviewComponent } from './plan-request/components/review/review.component';
import { TicketsInformationComponent } from './plan-request/components/tickets-information/tickets-information.component';
import { PlanRequestComponent } from './plan-request/plan-request.component';
import { PlanRoutingModule } from './plan-routing.module';
import { ResellerListPlanComponent } from './reseller-list-plan/reseller-list-plan.component';
import { DuplicatePlanOrchestratorService } from './services/duplicate-plan-orchestrator.service';
import { planTrackingProvider } from './tracking/plan.tracking-provider';

@NgModule({
  declarations: [
    ListPlanComponent,
    PlanCardComponent,
    PlanRequestComponent,
    PlanRequestManagementComponent,
    PlanSetupComponent,
    TicketsInformationComponent,
    PhotosComponent,
    ReviewComponent,
    ShareModalComponent,
    DuplicatePlanModalComponent,
    ResellerListPlanComponent,
  ],
  imports: [
    IgntAlertComponent,
    CommonModule,
    PlanRoutingModule,
    ...MENU,
    IgntIconComponent,
    TranslateModule,
    ClipboardModule,
    PageTitleModule,
    FiltersModule,
    GoBackModule,
    HelpPopoverModule,
    InlineLoaderModule,
    DateSelectorExtendedModule,
    IconsModule,
    PipesModule,
    SearchBarModule,
    PermissionBaseModule,
    ReactiveFormsModule,
    IFrameResizerModule,
    SharedComponentsModule,
    OptimizelyModule,
    ModalContentModule,
    IgntButtonComponent,
    IgntCommonButtonComponent,
    IgntExpansionPanelComponent,
    EventSelectionBandComponent,
    IgntSkeletonComponent,
    OrganizationDashboardComponent,
    IgntLinkComponent,
    AmbassadorOverviewComponent,
    IgntTagComponent,
    HelpTopicBannerComponent,
    HideWrapperOnHelpTopicCloseDirective,
    PlanStatusTagComponent,
    CreateEventModalComponent,
    CreateEventStickyBarComponent,
    ListPlanHeaderComponent,
    PlansAggregatesKpiBarComponent,
    FzAssistantHostDirective,
  ],
  providers: [DuplicatePlanOrchestratorService, NgbActiveModal, ...planTrackingProvider()],
})
export class PlanModule {}
