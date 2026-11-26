import { Directive, Injector, Input, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';

import { OptimizelyService } from '../../optimizely/optimizely.service';
import { UserService } from '../../services/user/user.service';

@Directive({
  selector: '[permissionBased]',
  standalone: false,
})
export class PermissionBasedDirective implements OnInit {
  /** Single permission or a list; a list grants access when the user holds at least one (`.some()`), mirroring `PermissionBasedGuard`. */
  @Input('permissionBased') id!: string | readonly string[];
  @Input('permissionBasedFeatureFlag') featureFlag?: string;

  constructor(
    private viewContainerRef: ViewContainerRef,
    private templateRef: TemplateRef<any>,
    private userService: UserService,
    private injector: Injector,
  ) {}

  ngOnInit(): void {
    this.userService.observePermissions().subscribe(() => {
      this.viewContainerRef.clear();
      // Resolve OptimizelyService lazily so the directive only depends on it when a feature flag is provided.
      const flag = this.featureFlag;
      const featureFlagEnabled = flag !== undefined && this.injector.get(OptimizelyService).isFeatureEnabled(flag) === true;
      const permissions = this.id instanceof Array ? this.id : [this.id];
      const hasPermission = permissions.some(permission => this.userService.hasPermission(permission));
      const hasAccess: boolean = hasPermission || featureFlagEnabled;
      if (hasAccess) {
        this.viewContainerRef.createEmbeddedView(this.templateRef);
      } else {
        this.viewContainerRef.clear();
      }
    });
  }
}
