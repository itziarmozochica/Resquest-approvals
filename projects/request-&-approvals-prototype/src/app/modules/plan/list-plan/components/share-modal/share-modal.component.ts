import { PlatformLocation } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';

import { faFacebookF } from '@fortawesome/free-brands-svg-icons/faFacebookF';
import { faFacebookMessenger } from '@fortawesome/free-brands-svg-icons/faFacebookMessenger';
import { faTwitter } from '@fortawesome/free-brands-svg-icons/faTwitter';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons/faWhatsapp';
import { faCopy as falCopy } from '@fortawesome/pro-light-svg-icons/faCopy';
import { faEnvelope as falEnvelope } from '@fortawesome/pro-light-svg-icons/faEnvelope';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { ShareNetwork } from './share-network';

@Component({
  selector: 'app-share-modal',
  standalone: false,
  templateUrl: './share-modal.component.html',
  styleUrls: ['./share-modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareModalComponent implements OnInit {
  #modal = inject(NgbActiveModal);
  builtLinks: {
    clipboard: string;
    facebook: string;
    facebookMessenger: string;
    twitter: string;
    whatsapp: string;
    mail: string;
  } = {
    clipboard: '',
    facebook: '',
    facebookMessenger: '',
    twitter: '',
    whatsapp: '',
    mail: '',
  };
  displayCopiedMessage = false;
  icons = {
    faFacebookF,
    faFacebookMessenger,
    faTwitter,
    faWhatsapp,
    falEnvelope,
    falCopy,
  };
  @Input() link: (network: ShareNetwork) => string;
  @Input() message = '';
  platformLocation = inject(PlatformLocation);
  @Output() shared = new EventEmitter<ShareNetwork>();

  constructor() {
    this.link = () => '';
    this.platformLocation.onPopState(() => this.#modal.dismiss());
  }

  close(): void {
    this.#modal.close();
  }
  copyLink(): void {
    this.displayCopiedMessage = true;
    this.shared.emit(ShareNetwork.CLIPBOARD);
  }

  ngOnInit(): void {
    this.builtLinks = {
      clipboard: this.#buildClipboardLink(),
      facebook: this.#buildFacebookLink(),
      facebookMessenger: this.#buildFacebookMessengerLink(),
      twitter: this.#buildTwitterLink(),
      whatsapp: this.#buildWhatsappLink(),
      mail: this.#buildMailLink(),
    };
  }

  shareFacebookClick(): void {
    this.#openPopup(ShareNetwork.FACEBOOK, this.builtLinks.facebook);
  }

  shareFacebookMessengerClick(): void {
    this.#openPopup(ShareNetwork.FACEBOOK_MESSENGER, this.builtLinks.facebookMessenger);
  }

  shareMailClick(): void {
    this.shared.emit(ShareNetwork.EMAIL);
  }

  shareTwitterClick(): void {
    this.#openPopup(ShareNetwork.TWITTER, this.builtLinks.twitter);
  }

  shareWhatsappClick(): void {
    this.shared.emit(ShareNetwork.WHATSAPP);
  }

  #buildClipboardLink(): string {
    return this.link(ShareNetwork.CLIPBOARD);
  }

  #buildFacebookLink(): string {
    const queryParams = this.#initFacebookQueryParams();
    queryParams.set('href', this.link(ShareNetwork.FACEBOOK));
    queryParams.set('quote', this.message);

    return `https://www.facebook.com/dialog/share?${queryParams.toString()}`;
  }

  #buildFacebookMessengerLink(): string {
    const link = this.link(ShareNetwork.FACEBOOK_MESSENGER);
    const queryParams = this.#initFacebookQueryParams();
    queryParams.set('link', link);
    queryParams.set('next', link);

    return `https://www.facebook.com/v2.8/dialog/send?${queryParams.toString()}`;
  }

  #buildMailLink(): string {
    const queryParams = new URLSearchParams();
    queryParams.set('subject', this.message);
    queryParams.set('body', this.link(ShareNetwork.EMAIL));

    return `mailto:?${queryParams.toString()}`;
  }

  #buildTwitterLink(): string {
    const queryParams = new URLSearchParams();
    queryParams.set('text', this.link(ShareNetwork.TWITTER));

    return `https://twitter.com/intent/tweet?${queryParams.toString()}`;
  }

  #buildWhatsappLink(): string {
    const queryParams = new URLSearchParams();
    queryParams.set('text', `${this.message} ${this.link(ShareNetwork.WHATSAPP)}`);

    return `https://api.whatsapp.com/send?${queryParams.toString()}`;
  }

  #initFacebookQueryParams(): URLSearchParams {
    const queryParams = new URLSearchParams();
    queryParams.set('display', 'popup');

    return queryParams;
  }

  #openPopup(network: ShareNetwork, url: string): void {
    const w: Window = window;
    if (w && w.open) {
      w.open(url, '', 'width=500,height=500');
      this.shared.emit(network);
    }
  }
}
