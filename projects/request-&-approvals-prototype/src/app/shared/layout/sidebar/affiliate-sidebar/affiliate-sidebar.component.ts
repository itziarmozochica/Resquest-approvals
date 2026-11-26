import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { Observable } from 'rxjs';

import { SelectedPlanContext } from '../../../services/__data__/selected-plan-context.model';

@Component({
  selector: 'app-affiliate-sidebar',
  standalone: false,
  templateUrl: './affiliate-sidebar.component.html',
})
export class AffiliateSidebarComponent {
  permissions = Permissions;
  @Input() queryParamsMap: Map<string, Observable<SelectedPlanContext>> = new Map();
  @Output() toggleSidebarEmitter = new EventEmitter<boolean>();

  handleMyAmbassadorProgramsClick(): void {
    this.toggleSidebar();
  }

  handleMyEventsClick(): void {
    this.toggleSidebar();
  }

  handleNetworkClick(): void {
    this.toggleSidebar();
  }

  toggleSidebar(): void {
    this.toggleSidebarEmitter.emit();
  }
}
