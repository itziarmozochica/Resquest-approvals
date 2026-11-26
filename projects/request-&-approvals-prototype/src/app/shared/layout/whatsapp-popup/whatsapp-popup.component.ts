import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Event, NavigationEnd, Router } from '@angular/router';

import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { ClickWhatsappPopupEvent } from '../../../core/tracking/core/events/click-whatsapp-popup';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { PartnerService } from '../../services/partner/partner.service';
import { UserService } from '../../services/user/user.service';
import { supportConfig } from './whatsapp-popup.support.config';

@Component({
  selector: 'app-whatsapp-popup',
  standalone: false,
  templateUrl: './whatsapp-popup.component.html',
  styleUrls: ['./whatsapp-popup.component.scss'],
})
export class WhatsappPopupComponent implements OnInit, OnDestroy {
  #destroy$ = new Subject<void>();
  readonly #excludedUrls: string[] = [
    '/attendees',
    '/box-office',
    '/capacity',
    '/pricing',
    '/sessions',
    '/invitations',
    '/validation',
    '/settings',
  ];
  #partnerService = inject(PartnerService);
  #router = inject(Router);
  #trackingService = inject(TrackingService);
  #userService = inject(UserService);
  readonly #whatsappApiHost = 'https://wa.me/';

  contactNumber: string;
  hideInMobile = false;
  showContactPopup = false;

  getContactUrl(): string {
    return `${this.#whatsappApiHost}${this.contactNumber}`;
  }

  handleClickOnIcon(): void {
    this.#trackingService.track(new ClickWhatsappPopupEvent());
  }

  isActive(): boolean {
    return this.#partnerService.getPartner() && this.showContactPopup && !this.#userService.isBusiness();
  }

  ngOnDestroy(): void {
    this.#destroy$.next();
  }

  ngOnInit(): void {
    function isNavigationEndEvent(routerEvent: Event): routerEvent is NavigationEnd {
      return routerEvent instanceof NavigationEnd;
    }

    this.#partnerService
      .observePartner()
      .pipe(takeUntil(this.#destroy$))
      .subscribe(data => {
        this.contactNumber = data !== null ? (supportConfig.get(data.countryCode) ?? '') : '';
        this.showContactPopup = Boolean(this.contactNumber);
      });

    this.#router.events.pipe(filter(isNavigationEndEvent), takeUntil(this.#destroy$)).subscribe(event => {
      this.hideInMobile = this.#isExcludedUrl(event.urlAfterRedirects);
    });
  }

  #isExcludedUrl(url: string): boolean {
    return url === '/' || this.#excludedUrls.some(excludedUrl => url.includes(excludedUrl));
  }
}
