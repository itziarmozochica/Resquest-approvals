import { Injectable } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

import { combineLatest } from 'rxjs';
import { map, pairwise, startWith, tap } from 'rxjs/operators';

import { Partner } from '../../models/partner/partner.model';
import { PartnerConfigService } from '../partner-config/partner-config.service';
import { PartnerMetaService } from '../partner-meta/partner-meta.service';
import { PartnerThemeLoaderService } from '../partner-theme-loader/partner-theme-loader.service';
import { PartnerService } from '../partner/partner.service';

@Injectable({
  providedIn: 'root',
})
export class PartnerLoaderService {
  constructor(
    private partnerService: PartnerService,
    private readonly route: ActivatedRoute,
    private readonly partnerThemeLoaderService: PartnerThemeLoaderService,
    private readonly partnerConfigService: PartnerConfigService,
    private readonly partnerMetaService: PartnerMetaService,
  ) {}

  init(): void {
    combineLatest([
      this.route.queryParams.pipe(map((params: Params) => !!params && (params['origin'] as string | undefined))),
      this.partnerService.observePartner().pipe(
        map((partner: Partner | null) => (partner !== null ? partner.id : null)),
        startWith(null),
      ),
    ])
      .pipe(
        map(([paramsPartnerId, partnerId]: [string | undefined, number | null]) =>
          paramsPartnerId !== undefined ? +paramsPartnerId : partnerId,
        ),
        pairwise(),
        tap(([prevId, id]: (number | null)[]) => {
          this.partnerThemeLoaderService.init(prevId, id);
          this.partnerConfigService.init(id);
          this.partnerMetaService.init();
        }),
      )
      .subscribe();
  }
}
