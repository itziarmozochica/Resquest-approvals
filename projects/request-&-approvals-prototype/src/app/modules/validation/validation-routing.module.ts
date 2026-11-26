import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { hasUnsavedChangesGuard } from '@fz-original/app/shared/guard/has-unsaved-changes/has-unsaved-changes.guard';
import { PermissionBasedGuard } from '@fz-original/app/shared/guard/permission-based/permission-based.guard';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';

import { ValidationComponent } from './components/validation/validation.component';

export const routes: Routes = [
  { component: ValidationComponent, path: '' },
  {
    canActivate: [PermissionBasedGuard],
    canDeactivate: [hasUnsavedChangesGuard],
    data: { permission: Permissions.CAN_VIEW_BOOKING_QUESTION_ANSWERS },
    path: ':orderId/responses',
    loadComponent: async () =>
      await import('../customer-questions-order-responses/containers/order-responses/order-responses.component').then(
        m => m.OrderResponsesComponent,
      ),
  },
];

@NgModule({
  exports: [RouterModule],
  imports: [RouterModule.forChild(routes)],
})
export class ValidationRoutingModule {}
