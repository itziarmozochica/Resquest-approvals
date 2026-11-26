import { ChangeDetectionStrategy, Component, inject, Input, input, OnInit } from '@angular/core';

import { FitTextDirective } from '../../directives/fit-text/fit-text.directive';
import { KioskNavigationService } from '../../kiosk-navigation.service';
import { KioskButtonComponent } from '../button/kiosk-button.component';
import { LanguageToggleComponent } from '../language-toggle/language-toggle.component';
import { ToolbarButtonComponent } from '../toolbar-button/toolbar-button.component';
import { PartnerService } from './../../../../../shared/services/partner/partner.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolbarButtonComponent, LanguageToggleComponent, FitTextDirective, KioskButtonComponent],
  selector: 'app-kiosk-hero',
  standalone: true,
  styleUrls: ['./kiosk-hero.component.scss'],
  templateUrl: './kiosk-hero.component.html',
})
export class KioskHeroComponent implements OnInit {
  readonly #kioskNavigationService: KioskNavigationService = inject(KioskNavigationService);
  readonly #partnerService: PartnerService = inject(PartnerService);
  @Input() badgeText?: string;
  defaultLogoImage = 'assets/images/logos/fever-logo.svg';
  hideContent = input(false);
  @Input() hideHomeButton = false;
  readonly isHomeDisabled = input(false);
  @Input() hideLanguageSelector = false;
  @Input() isSticky = false;
  readonly manageBookingLabel = input('');
  readonly onManageBookingClicked = input<() => void>();
  readonly showManageBooking = input(false);
  @Input() supportingText?: string;
  readonly title = input('');

  ngOnInit(): void {
    const partnerLogo = this.#partnerService.getPartner()?.brand?.kioskLogoHeader ?? null;
    if (partnerLogo !== null) {
      this.defaultLogoImage = partnerLogo;
    }
  }

  onHomeClicked(): void {
    this.#kioskNavigationService.navigateHome();
  }
}
