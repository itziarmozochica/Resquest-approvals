import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { EventSelectionBandComponent } from '@fz-original/app/shared/components/event-selection-band/event-selection-band.component';
import { HelpTopicBannerComponent } from '@fz-original/app/shared/components/help-topic-banner/help-topic-banner.component';
import { PlanHeaderSummaryComponent } from '@fz-original/app/shared/components/plan-header-summary/plan-header-summary.component';
import { PlanPreviewLinksComponent } from '@fz-original/app/shared/components/plan-preview-links/plan-preview-links.component';
import { PlanReviewLockedBannerComponent } from '@fz-original/app/shared/components/plan-review-locked-banner/plan-review-locked-banner.component';
import { HideWrapperOnHelpTopicCloseDirective } from '@fz-original/app/shared/directives/hide-wrapper-on-help-topic-close/hide-wrapper-on-help-topic-close.directive';
import { SanitizePipe } from '@fz-original/app/shared/pipes/sanitize/sanitize.pipe';
import {
  IgntAlertComponent,
  IgntButtonComponent as IgntButtonElementComponent,
  IgntPillButtonComponent,
  IgntTooltipDirective,
  MENU,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntDividerComponent } from '@ignite/legacy/components/ignt-divider/ignt-divider.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import { TranslateModule } from '@ngx-translate/core';

import { SharedComponentsModule } from '../../shared/components/shared-components.module';
import { PermissionBaseModule } from '../../shared/directives/permission-based/permission-base.module';
import { IconsModule } from '../../shared/icons/icons.module';
import { ModalContentModule } from '../../shared/layout/modal/modal-content.module';
import { OptimizelyModule } from '../../shared/optimizely/optimizely.module';
import { SearchBarModule } from '../../shared/search-bar/search-bar.module';
import { FzAssistantHostDirective } from '../../shared/services/fz-assistant/host/fz-assistant-host.directive';
import { ContentPlanDetailsComponent } from './components/content-plan-details/content-plan-details.component';
import { ContentPlanComponent } from './components/content-plan/content-plan.component';
import { EmailModalComponent } from './components/email-modal/email-modal.component';
import { NewDescriptionComponent } from './components/email-modal/new-description-modal/new-description-modal.component';
import { NewNameComponent } from './components/email-modal/new-name-modal/new-name-modal.component';
import { NewPhotoComponent } from './components/email-modal/new-photo-modal/new-photo-modal.component';
import { EditionConfirmationModalComponent } from './components/plan-edition/edition-confirmation-modal/edition-confirmation-modal.component';
import { ImmersivePlanLayoutEditionComponent } from './components/plan-edition/immersive-plan-layout/immersive-plan-layout-edition.component';
import { PlanContentEditionComponent } from './components/plan-edition/plan-content-edition/plan-content-edition.component';
import { PlanEditionHeaderComponent } from './components/plan-edition/plan-edition-header/plan-edition-header.component';
import { PlanEditionComponent } from './components/plan-edition/plan-edition.component';
import { GalleryConfirmationModalComponent } from './components/plan-edition/plan-gallery-edition/gallery-confirmation-modal/gallery-confirmation-modal.component';
import { GalleryImageCropModalComponent } from './components/plan-edition/plan-gallery-edition/gallery-image-crop-modal/gallery-image-crop-modal.component';
import { ImageSortableListComponent } from './components/plan-edition/plan-gallery-edition/image-sortable-list/image-sortable-list.component';
import { ListSortingComponent } from './components/plan-edition/plan-gallery-edition/list-sorting/list-sorting.component';
import { PlanGalleryEditionComponent } from './components/plan-edition/plan-gallery-edition/plan-gallery-edition.component';
import { VideoDataModalComponent } from './components/plan-edition/plan-gallery-edition/video-data-modal/video-data-modal.component';
import { PlanHeaderCardComponent } from './components/plan-edition/plan-header-card/plan-header-card.component';
import { PlanTagsEditionComponent } from './components/plan-edition/plan-tags-edition/plan-tags-edition.component';
import { ContentPlanRoutingModule } from './content-plan-routing.module';

@NgModule({
  declarations: [
    ContentPlanComponent,
    ContentPlanDetailsComponent,
    EmailModalComponent,
    NewDescriptionComponent,
    NewNameComponent,
    NewPhotoComponent,
    PlanEditionComponent,
    PlanGalleryEditionComponent,
    ListSortingComponent,
    ImageSortableListComponent,
    EditionConfirmationModalComponent,
    PlanHeaderCardComponent,
    VideoDataModalComponent,
  ],
  exports: [PlanGalleryEditionComponent, PlanHeaderCardComponent],
  imports: [
    EventSelectionBandComponent,
    IgntAlertComponent,
    PlanContentEditionComponent,
    PlanEditionHeaderComponent,
    ContentPlanRoutingModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    SearchBarModule,
    IconsModule,
    IgntIconComponent,
    ...MENU,
    ModalContentModule,
    PermissionBaseModule,
    IgntTooltipDirective,
    SharedComponentsModule,
    OptimizelyModule,
    IgntButtonElementComponent,
    IgntIconButtonComponent,
    IgntPillButtonComponent,
    IgntDividerComponent,
    IgntTabsComponent,
    IgntTabsItemComponent,
    ImmersivePlanLayoutEditionComponent,
    SanitizePipe,
    HelpTopicBannerComponent,
    HideWrapperOnHelpTopicCloseDirective,
    PlanReviewLockedBannerComponent,
    GalleryConfirmationModalComponent,
    GalleryImageCropModalComponent,
    PlanHeaderSummaryComponent,
    PlanPreviewLinksComponent,
    PlanTagsEditionComponent,
    FzAssistantHostDirective,
  ],
})
export class ContentPlanModule {}
