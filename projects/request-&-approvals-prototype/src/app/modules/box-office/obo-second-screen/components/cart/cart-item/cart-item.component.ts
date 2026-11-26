import { Component, inject, Input } from '@angular/core';

import { TicketType } from '@fz-original/app/shared/models/ticket-type/ticket-type.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { TranslateService } from '@ngx-translate/core';

import { OboSecondScreenCartSession } from '../../../models/obo-second-screen-cart-item.model';

@Component({
  selector: 'app-cart-item',
  standalone: false,
  templateUrl: './cart-item.component.html',
  styleUrls: ['./cart-item.component.scss'],
})
export class CartItemComponent {
  #optimizelyService = inject(OptimizelyService);

  @Input({ required: true }) cartSession!: OboSecondScreenCartSession;

  protected readonly locale: string;
  protected readonly hideExplodingPipes: boolean =
    this.#optimizelyService.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.KIOSK_HIDE_EXPLODING_PIPES,
      team: 'parks',
    }) ?? false;

  constructor(translateService: TranslateService) {
    this.locale = translateService.currentLang;
  }

  protected getSessionName(name: string): string {
    if (!this.hideExplodingPipes) {
      return name;
    }
    const parts = name.split(TicketType.EXPLODE_PIPE_SEPARATOR);
    return parts[parts.length - 1];
  }
}
