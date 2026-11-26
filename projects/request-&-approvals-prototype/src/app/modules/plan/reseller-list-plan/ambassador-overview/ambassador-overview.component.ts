import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { B2CSiteConfiguration } from '@fz-original/app/modules/resellers/models/b2c-site-configuration.model';
import { OrganizationDashboardComponent } from '@fz-original/app/shared/components/organization-dashboard/organization-dashboard.component';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { GraphGroup } from '@fz-original/app/shared/models/graph/graph.group';
import { PartnerConfig } from '@fz-original/app/shared/models/partner/partner-config.model';
import { User } from '@fz-original/app/shared/models/user/user.model';
import { B2cSiteService } from '@fz-original/app/shared/services/b2c-site/b2c-site.service';
import {
  createScopedInstance,
  SCOPED_PARTNER_CONFIG_SERVICE,
} from '@fz-original/app/shared/services/partner-config/partner-config.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntLinkComponent } from '@ignite/legacy/components/ignt-link/ignt-link.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-ambassador-overview',
  standalone: true,
  imports: [CommonModule, OrganizationDashboardComponent, IgntWrapperCardComponent, IconsModule, IgntLinkComponent, TranslateModule],
  templateUrl: './ambassador-overview.component.html',
  styleUrls: ['./ambassador-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: SCOPED_PARTNER_CONFIG_SERVICE, useFactory: createScopedInstance }],
})
export class AmbassadorOverviewComponent implements OnInit {
  protected readonly GraphGroup = GraphGroup;
  #b2cSiteService = inject(B2cSiteService);
  #changeDetectorRef = inject(ChangeDetectorRef);
  readonly #destroyRef = inject(DestroyRef);
  #partnerConfigService = inject(SCOPED_PARTNER_CONFIG_SERVICE);
  #userService = inject(UserService);

  @Input() channelId: string | null = null;

  partnerConfig: PartnerConfig | null = null;
  userName$: Observable<string> = new Observable();

  ngOnInit() {
    this.userName$ = this.#userService.getUserObservable().pipe(map((user: User) => user?.name ?? ''));
    this.#b2cSiteService
      .get()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((b2cSite: B2CSiteConfiguration | null) => b2cSite?.partnerId && this.#partnerConfigService.init(b2cSite.partnerId));
    this.#partnerConfigService.$config.subscribe((partnerConfig: PartnerConfig | null) => {
      this.partnerConfig = partnerConfig;
      this.#changeDetectorRef.detectChanges();
    });
  }
}
