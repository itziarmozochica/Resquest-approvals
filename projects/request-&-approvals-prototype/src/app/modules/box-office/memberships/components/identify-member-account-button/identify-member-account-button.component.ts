import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IgntButtonComponent, type IgntButtonIcon } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { MemberAccountMembership } from '../../models/member-account.model';
import { memberAccountBadge, type MemberAccountBadge } from '../../utils/member-account-badge.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, TranslateModule],
  selector: 'app-identify-member-account-button',
  standalone: true,
  styleUrl: './identify-member-account-button.component.scss',
  templateUrl: './identify-member-account-button.component.html',
})
export class IdentifyMemberAccountButtonComponent {
  readonly memberships = input<Array<MemberAccountMembership>>([]);

  readonly identifyMemberAccount = output<void>();
  readonly removeMemberAccount = output<void>();

  protected readonly badge = computed<MemberAccountBadge | null>(() => memberAccountBadge(this.memberships()));
  protected readonly hasHolderName = computed<boolean>(() => this.memberships().length === 1 && this.memberships()[0].holderName !== null);

  protected readonly addressCardIcon = computed<IgntButtonIcon>(() => ({
    name: 'address-card',
    variant: this.badge() !== null ? 'light' : 'solid',
  }));
  protected readonly timesIcon: IgntButtonIcon = { name: 'times', variant: 'solid' };
}
