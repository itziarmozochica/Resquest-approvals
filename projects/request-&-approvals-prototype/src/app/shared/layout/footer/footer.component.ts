import { Component, inject, Input, OnInit } from '@angular/core';

import { memo } from '@fz-original/app/app/utils/ng/ng.util';
import { VideoDialogComponent } from '@fz-original/app/modules/reports/dashboard-builder/components/video-dialog/video-dialog.component';
import { VideoDialogData } from '@fz-original/app/modules/reports/dashboard-builder/components/video-dialog/video-dialog.model';
import { OrganizationTypeEnum } from '@fz-original/app/shared/models/partner/organization-type.enum';
import { PartnerSupportDataInterface } from '@fz-original/app/shared/models/partner/partner-support-data.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { PartnerConfigService } from '@fz-original/app/shared/services/partner-config/partner-config.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';

import packageJson from '../../../../../package.json';
import { supportConfig } from './footer.support.config';
import { clickGuide } from './tracking/events/click-guide.event';

@Component({
  selector: 'app-footer',
  standalone: false,
  styleUrls: ['./footer.component.scss'],
  templateUrl: './footer.component.html',
})
export class FooterComponent implements OnInit {
  static readonly partnersSupportEmail = 'partners@example.com';

  #igntDialogService = inject(IgntDialogService);
  #optimizelyService = inject(OptimizelyService);
  #partnerConfigService: PartnerConfigService = inject(PartnerConfigService);
  #partnerService: PartnerService = inject(PartnerService);
  #fzTracking = inject(FzTrackingService);
  #translateService: TranslateService = inject(TranslateService);
  #userService = inject(UserService);
  readonly partnersSupportEmail = FooterComponent.partnersSupportEmail;
  readonly partnersSupportEmailLink = PartnerConfigService.defaultSupportEmail;
  get isBusiness(): boolean {
    return this.#userService.isBusiness() ?? false;
  }

  appVersion: string = packageJson.version;
  getCurrentYear = memo<() => number>(() => new Date().getFullYear());
  hasPartner = false;
  isAffiliate = false;
  isBookingAgent = false;
  isFooterPhoneHidden = false;
  isPartner = false;
  @Input() logged = false;
  supportData: PartnerSupportDataInterface | null = null;

  handleClickGuide(): void {
    this.#fzTracking.track(
      clickGuide({
        time: new Date().toISOString(),
      }),
    );
  }

  ngOnInit(): void {
    this.isFooterPhoneHidden =
      this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.ZENDESK_HIDE_FOOTER_NUMBER,
        team: 'b2b-inventory',
      }) === true;

    this.#partnerService.observePartner().subscribe(data => {
      this.hasPartner = data !== null;

      if (!this.hasPartner) {
        this.supportData = null;
      }

      this.isAffiliate = data?.type == OrganizationTypeEnum.RESELLER;

      if (this.isAffiliate) {
        return;
      }

      this.isBookingAgent = this.#userService.isBusiness();
      this.isPartner = !this.isAffiliate && !this.isBookingAgent;

      this.#partnerConfigService.$config.subscribe(config => {
        this.supportData = config?.supportData ?? supportConfig.get(data?.countryCode ?? '') ?? null;
      });
    });
  }

  showModal(src: string): void {
    this.#igntDialogService.openModal<void, VideoDialogData>(VideoDialogComponent, {
      data: { srcVideo: src },
      size: 'lg',
    });
  }

  translate(id: string): string {
    return this.#translateService.instant(id);
  }
}
