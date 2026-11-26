import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

import { IdentifyMemberAccountButtonComponent } from '@fz-original/app/modules/box-office/memberships/components/identify-member-account-button/identify-member-account-button.component';
import { MembershipsIdentifyMemberButtonComponent } from '@fz-original/app/modules/box-office/memberships/components/identify-member-button/identify-member-button.component';
import { MemberAccountMembership } from '@fz-original/app/modules/box-office/memberships/models/member-account.model';
import { MembershipsMember } from '@fz-original/app/modules/box-office/memberships/models/memberships.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { IgntIconComponent } from '@ignite/icon';
import { IgntTourAnchorDirective } from '@ignite/legacy/components/ignt-ui-tour/ignt-tour-anchor.directive';

import { OssTab } from '../../models/oss.tab.enum';
import { OssDateSelectorButtonComponent } from '../oss-date-selector-button/oss-date-selector-button.component';
import { OssPlanPlaceSelectorButtonComponent } from '../oss-plan-place-selector-button/oss-plan-place-selector-button.component';

@Component({
  selector: 'app-oss-buttons-section',
  templateUrl: './oss-buttons-section.component.html',
  styleUrls: ['./oss-buttons-section.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IdentifyMemberAccountButtonComponent,
    IgntIconComponent,
    MembershipsIdentifyMemberButtonComponent,
    NgIf,
    OssPlanPlaceSelectorButtonComponent,
    OssDateSelectorButtonComponent,
    IgntTourAnchorDirective,
  ],
})
export class OssButtonsSectionComponent {
  get datetime(): string {
    if (!this.selectedDatetime) {
      return '';
    }

    return this.selectedDatetime;
  }

  get planName(): string {
    if (!this.selectedPlan || !this.selectedPlaceId) {
      return '';
    }

    const place = this.selectedPlan?.places?.find(place => place.id === parseInt(this.selectedPlaceId ?? ''));
    return '(' + this.selectedPlan?.id + ') ' + this.selectedPlan?.name + (place?.name ? ' | ' + place?.name : '');
  }

  @Input({ required: true }) hasProductCatalog = false;
  @Input({ required: true }) isLoadingProductCatalog = false;
  @Input({ required: true }) isProductCatalogLoaded = false;
  @Input({ required: true }) locale = '';
  @Input() canIdentifyMember = false;
  @Input() canIdentifyMemberAccount = false;
  @Input() memberAccountMemberships: Array<MemberAccountMembership> = [];
  @Input() membershipsMember: MembershipsMember | null = null;
  @Output() identifyMemberAccount = new EventEmitter<void>();
  @Output() identifyMember = new EventEmitter<void>();
  @Output() openDateSelectorModal = new EventEmitter<void>();
  @Output() openModalPlan = new EventEmitter<void>();
  @Output() openSearch = new EventEmitter<{ buttonRect: DOMRect }>();
  @Output() removeMember = new EventEmitter<void>();
  @Output() removeMemberAccount = new EventEmitter<void>();
  protected readonly OssTab = OssTab;
  @ViewChild('searchButton') searchButton!: ElementRef<HTMLButtonElement>;
  @Input() selectedDatetime: string | null = null;
  @Input({ required: true }) selectedPlaceId: string | null = null;
  @Input({ required: true }) selectedPlan: Plan | null = null;
  @Input({ required: true }) showPlanPlaceSelector = false;
  @Input({ required: true }) selectedCustomTabDatetime: string | null = null;
  @Input({ required: true }) selectedTab: OssTab | null = null;
  @Input({ required: true }) timezone = '';

  search(): void {
    const buttonRect = this.searchButton.nativeElement.getBoundingClientRect();
    this.openSearch.emit({ buttonRect });
  }
}
