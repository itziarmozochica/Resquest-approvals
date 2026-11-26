import { CurrencyPipe, NgIf, NgTemplateOutlet } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Partner } from '../../../../../../shared/models/partner/partner.model';
import { User } from '../../../../../../shared/models/user/user.model';
import { PartnerService } from '../../../../../../shared/services/partner/partner.service';
import { UserService } from '../../../../../../shared/services/user/user.service';
import { InvoicingPeriod } from '../../../../../settings/shared/models/invoicing-period.model';
import { InvoicingPeriodService } from '../../../../../settings/shared/services/invoicing-period.service';

@Component({
  selector: 'app-active-invoicing-period-banner',
  templateUrl: './active-invoicing-period-banner.component.html',
  styleUrls: ['./active-invoicing-period-banner.component.scss'],
  standalone: true,
  imports: [TranslateModule, NgTemplateOutlet, CurrencyPipe, NgIf],
})
export class ActiveInvoicingPeriodBannerComponent implements OnInit {
  user: User | null = null;
  partner: Partner | null = null;
  locale: string;
  activeInvoicingPeriod: InvoicingPeriod | null = null;

  constructor(
    private partnerService: PartnerService,
    private userService: UserService,
    private invoicingPeriodService: InvoicingPeriodService,
    private translate: TranslateService,
  ) {
    this.locale = this.translate.currentLang;
  }

  ngOnInit(): void {
    this.user = this.userService.getUser();
    this.partner = this.partnerService.getPartner();
    this.getActiveInvoicingPeriod();
  }

  getActiveInvoicingPeriod(): void {
    if (!this.user || !this.partner) {
      return;
    }
    this.invoicingPeriodService.getActiveInvoicingPeriod({ partnerId: this.partner.id, userId: this.user.id }).subscribe(response => {
      if (response && response.data) {
        this.activeInvoicingPeriod = response.data;
      }
    });
  }
}
