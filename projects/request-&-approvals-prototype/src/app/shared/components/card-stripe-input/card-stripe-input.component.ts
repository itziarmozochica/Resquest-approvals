import { NgFor } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { StripeKeys } from '@fz-original/environments/environment.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { CardElement } from '@feverup/ts-stripe-sdk';

import { IconsModule } from '../../icons/icons.module';
import { StripeService } from '../../services/stripe/stripe.service';

@Component({
  selector: 'app-card-stripe-input',
  standalone: true,
  imports: [NgFor, TranslateModule, IconsModule],
  templateUrl: './card-stripe-input.component.html',
  styleUrls: ['./card-stripe-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardStripeInputComponent implements AfterViewInit, OnDestroy {
  @Input() currency!: string | keyof StripeKeys;

  @Output() cardAdded: EventEmitter<CardElement | null> = new EventEmitter();

  card: CardElement | null = null;
  termsLink: string;
  privacyPolicyLink: string;

  cardLogos: string[] = [
    'assets/images/payment-methods/visa.svg',
    'assets/images/payment-methods/mastercard.svg',
    'assets/images/payment-methods/amex.svg',
  ];
  cardElementId = 'card-element';

  private baseGoogleDocsUrl = 'https://docs.google.com/document/d';

  private termsLinks = new Map<string, string>([
    ['es', `${this.baseGoogleDocsUrl}/1Btyn_NzzmuK-w3Tw1aTzZ1lgmUkN1oUR_i6ujLk0JdU/pub`],
    ['en', `${this.baseGoogleDocsUrl}/e/2PACX-1vRjcaWbe7Iv4Cx_N-lkV4S0HICGAMM6LYC62wCHyxdNtIb48NotsDK7CU-9nRqUs-Q7n4EyY2Imi-gJ/pub`],
  ]);
  private privacyPolicyLinks = new Map<string, string>([
    ['es', `${this.baseGoogleDocsUrl}/164lMDAweZZkO_geaqcz4AxDTip1hBAEvlMXUR--dpYE/pub`],
    ['en', `${this.baseGoogleDocsUrl}/e/2PACX-1vTg8F3c5DKuYYtMtb1bG3tCYLTXP21GGdg42QDEJTtsaMHU9bhITKxWCp9-Fku3HxPC0FCkOFwzx4SD/pub`],
  ]);

  #destroyRef = inject(DestroyRef);

  constructor(
    private stripeService: StripeService,
    private translate: TranslateService,
  ) {
    this.termsLink = this.getTermLink();
    this.privacyPolicyLink = this.getPrivacyPolicyLink();
  }

  ngAfterViewInit(): void {
    this.stripeService
      .createCardElement(this.currency as keyof StripeKeys, `#${this.cardElementId}`)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(card => {
        this.card = card;
        this.cardAdded.emit(card);
      });
  }

  private getTermLink(): string {
    const lang = this.translate.currentLang;
    return this.termsLinks.get(lang) ?? this.termsLinks.get('en')!;
  }

  private getPrivacyPolicyLink(): string {
    const lang = this.translate.currentLang;
    return this.privacyPolicyLinks.get(lang) ?? this.privacyPolicyLinks.get('en')!;
  }

  ngOnDestroy(): void {
    this.card = null;
    this.cardAdded.emit(null);
  }
}
