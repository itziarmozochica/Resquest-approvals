import { NgModule } from '@angular/core';

import { PermissionBasedDirective } from './permission-based.directive';

@NgModule({
  imports: [],
  declarations: [PermissionBasedDirective],
  exports: [PermissionBasedDirective],
})
export class PermissionBaseModule {}
