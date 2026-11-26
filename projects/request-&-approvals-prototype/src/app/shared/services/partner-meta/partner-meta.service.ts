import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { take } from 'rxjs/operators';

import { PartnerConfig } from '../../models/partner/partner-config.model';
import { PartnerConfigService } from '../partner-config/partner-config.service';

@Injectable({
  providedIn: 'root',
})
export class PartnerMetaService {
  private DEFAULT_TITLE = 'Fever Zone';

  constructor(
    private readonly partnerConfigService: PartnerConfigService,
    private readonly title: Title,
  ) {}

  init(): void {
    this.partnerConfigService.$config.pipe(take(1)).subscribe((partnerConfig: PartnerConfig) => {
      this.title.setTitle(partnerConfig?.meta?.title ? partnerConfig.meta.title : this.DEFAULT_TITLE);
    });
  }
}
