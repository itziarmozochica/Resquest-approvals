import { ChangeDetectionStrategy, Component, computed, EventEmitter, Input, input, Output } from '@angular/core';

import { IgntButtonComponent, type IgntButtonIcon } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { MembershipsMember } from '../../models/memberships.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, TranslateModule],
  selector: 'app-memberships-identify-member-button',
  standalone: true,
  styleUrl: './identify-member-button.component.scss',
  templateUrl: './identify-member-button.component.html',
})
export class MembershipsIdentifyMemberButtonComponent {
  @Input() compact = false;
  @Input() iconOnly = false;
  readonly membershipsMember = input<MembershipsMember | null>(null);

  @Output() identifyMember = new EventEmitter<void>();
  @Output() removeMember = new EventEmitter<void>();

  protected readonly addressCardIcon = computed<IgntButtonIcon>(() => ({
    name: 'address-card',
    variant: this.membershipsMember() !== null ? 'light' : 'solid',
  }));
  protected readonly timesIcon: IgntButtonIcon = { name: 'times', variant: 'solid' };
}
