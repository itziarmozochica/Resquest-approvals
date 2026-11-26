import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PermissionBasedGuard } from '../../shared/guard/permission-based/permission-based.guard';
import { FeatureFlags } from '../../shared/optimizely/feature-flags';
import { Permissions } from '../../shared/services/user/permissions';
import { RecordsListComponent } from '../project-management/containers/records-list/records-list.component';
import { ApprovalDetailComponent } from './approvals/containers/approval-detail/approval-detail.component';
import { ApprovalNewComponent } from './approvals/containers/approval-new/approval-new.component';
import { InformationRequestDetailComponent } from './information-requests/containers/information-request-detail/information-request-detail.component';
import { InformationRequestEvaluationComponent } from './information-requests/containers/information-request-evaluation/information-request-evaluation.component';
import { InformationRequestNewComponent } from './information-requests/containers/information-request-new/information-request-new.component';
import { unsavedChangesGuard } from './shared/guards/unsaved-changes.guard';

const informationRequestChildren: Routes = [
  { path: '', component: RecordsListComponent, data: { defaultTypes: ['request'], defaultStatus: 'pending' } },
  {
    path: 'new',
    canActivate: [PermissionBasedGuard],
    data: { permission: Permissions.CAN_CREATE_INFORMATION_REQUEST, featureFlag: FeatureFlags.PROJECT_MANAGEMENT_FZ },
    component: InformationRequestNewComponent,
  },
  {
    path: ':requestId/evaluate',
    canActivate: [PermissionBasedGuard],
    data: { permission: Permissions.CAN_ADMIN_INFORMATION_REQUEST },
    component: InformationRequestEvaluationComponent,
  },
  { path: ':requestId', component: InformationRequestDetailComponent, canDeactivate: [unsavedChangesGuard] },
];

const approvalChildren: Routes = [
  { path: '', component: RecordsListComponent, data: { defaultTypes: ['approval'], defaultStatus: 'pending' } },
  {
    path: 'new',
    canActivate: [PermissionBasedGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { permission: Permissions.CAN_CREATE_APPROVAL, featureFlag: FeatureFlags.PROJECT_MANAGEMENT_FZ },
    component: ApprovalNewComponent,
  },
  { path: ':approvalId', canDeactivate: [unsavedChangesGuard], component: ApprovalDetailComponent },
];

export const routes: Routes = [
  {
    path: 'projects/:projectId/information-requests',
    canActivate: [PermissionBasedGuard],
    data: {
      permission: [Permissions.CAN_SUBMIT_INFORMATION_REQUEST, Permissions.CAN_CREATE_INFORMATION_REQUEST],
      featureFlag: FeatureFlags.PROJECT_MANAGEMENT_FZ,
    },
    children: informationRequestChildren,
  },
  {
    path: 'projects/:projectId/approvals',
    canActivate: [PermissionBasedGuard],
    data: {
      permission: [Permissions.CAN_SUBMIT_APPROVAL, Permissions.CAN_CREATE_APPROVAL],
      featureFlag: FeatureFlags.PROJECT_MANAGEMENT_FZ,
    },
    children: approvalChildren,
  },
  {
    path: 'information-requests',
    canActivate: [PermissionBasedGuard],
    data: {
      permission: [Permissions.CAN_SUBMIT_INFORMATION_REQUEST, Permissions.CAN_CREATE_INFORMATION_REQUEST],
      featureFlag: FeatureFlags.PROJECT_MANAGEMENT_FZ,
    },
    children: informationRequestChildren,
  },
  {
    path: 'approvals',
    canActivate: [PermissionBasedGuard],
    data: {
      permission: [Permissions.CAN_SUBMIT_APPROVAL, Permissions.CAN_CREATE_APPROVAL],
      featureFlag: FeatureFlags.PROJECT_MANAGEMENT_FZ,
    },
    children: approvalChildren,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class IrApprovalRoutingModule {}
