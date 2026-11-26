import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateService } from '@ngx-translate/core';

import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { SharedComponentsModule } from '../../components/shared-components.module';
import { UserInfoComponent } from '../../components/user-info/user-info.component';
import { MenuItem } from '../../models/header/header.model';
import { Partner } from '../../models/partner/partner.model';
import { CustomerServiceChatFacade } from '../../services/customer-service-chat/customer-service-chat.facade';
import { HeaderStateService } from '../../services/header/header-state.service';
import { PartnerService } from '../../services/partner/partner.service';
import { ZendeskService } from '../../services/script-loader/zendesk/zendesk.service';
import { MobileMenuItemComponent } from './mobile-menu-item/mobile-menu-item.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntTagComponent, MobileMenuItemComponent, SharedComponentsModule, UserInfoComponent],
  selector: 'app-menu-bottom-sheet',
  styleUrl: './menu-bottom-sheet.component.scss',
  templateUrl: './menu-bottom-sheet.component.html',
})
export class MenuBottomSheetComponent {
  static readonly chatWithUsActionId = 'chat-with-us';
  readonly #authenticationService = inject(AuthenticationService);
  readonly #customerServiceChatFacade = inject(CustomerServiceChatFacade);
  readonly #headerStateService = inject(HeaderStateService);
  readonly #partnerService = inject(PartnerService);
  readonly #translateService = inject(TranslateService);
  readonly #zendeskService = inject(ZendeskService);

  readonly actions = computed<MenuItem[]>(() => [
    ...this.#headerStateService.featureMenuItems(),
    ...(this.#zendeskService.isHeaderLauncherVisible() ? [this.#buildChatWithUsAction()] : []),
    ...this.#headerStateService.globalMenuItems(),
  ]);
  readonly isOpen: Signal<boolean> = this.#headerStateService.isMenuOpen;
  partner: Partner | null = this.#partnerService.getPartner();
  userName: Signal<string | null> = toSignal(this.#authenticationService.observeUserName(), {
    initialValue: this.#authenticationService.getUserName(),
  });

  close(): void {
    this.#headerStateService.closeMenu();
  }

  onActionClick(action: MenuItem): void {
    if (action.id === MenuBottomSheetComponent.chatWithUsActionId) {
      this.#customerServiceChatFacade.open('mobile_menu');
    } else {
      this.#headerStateService.actionClick(action.id);
    }
    this.close();
  }

  #buildChatWithUsAction(): MenuItem {
    return {
      icon: ['fal', 'user-headset'],
      id: MenuBottomSheetComponent.chatWithUsActionId,
      label: this.#translateService.instant('menu.chatWithUs'),
    };
  }
}
