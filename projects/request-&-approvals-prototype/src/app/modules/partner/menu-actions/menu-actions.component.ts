import { ChangeDetectionStrategy, Component, inject, input, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { Partner } from '../../../shared/models/partner/partner.model';
import { HeaderStateService } from '../../../shared/services/header/header-state.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-menu-actions',
  standalone: false,
  styleUrl: '../../../../theme/components/navigation/headerbar/menu-actions.scss',
  templateUrl: './menu-actions.component.html',
})
export class MenuActionsComponent {
  readonly #authenticationService = inject(AuthenticationService);
  readonly #headerStateService = inject(HeaderStateService);

  readonly globalMenuItems = this.#headerStateService.globalMenuItems;
  readonly onsiteSetupName = input<string | null>(null);
  readonly partner = input<Partner | null>(null);
  userName: Signal<string | null> = toSignal(this.#authenticationService.observeUserName(), {
    initialValue: this.#authenticationService.getUserName(),
  });

  onActionClick(actionId: string): void {
    this.#headerStateService.actionClick(actionId);
  }
}
