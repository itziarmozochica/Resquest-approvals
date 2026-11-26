import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Empty component required for the /logout route.
 * Needed because route guards are executed when navigating to /logout.
 * The actual logout logic (HTTP call and state reset) is handled by the authentication service's logout() method.
 */
@Component({
  template: '',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoutComponent {}
