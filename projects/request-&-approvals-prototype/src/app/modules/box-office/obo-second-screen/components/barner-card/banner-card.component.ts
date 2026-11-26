import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { SanitizeService } from '@fz-original/app/app/services/sanitize/sanitize.service';
import { SecondScreenConfiguration } from '@fz-original/app/modules/box-office/shared/models/second-screen-configuration';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, from, of, switchMap } from 'rxjs';

import { QrGeneratorService } from '../../../../../shared/services/qr-generator/qr-generator.service';
import { OboSecondScreenPartnerState } from '../../models/obo-second-screen-partner.state';
import { resolvePartnerQrUrl, resolvePartnerStandbyTitleKey, resolvePartnerUrl } from '../../utils/banner-card-partner.util';
import { getUrlHost, toFilledValue } from '../../utils/second-screen-configuration.util';

export enum BannerCardState {
  StandBy,
  Farewell,
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-banner-card',
  styleUrl: './banner-card.component.scss',
  templateUrl: './banner-card.component.html',
})
export class BannerCardComponent {
  static readonly farewellTitleKey = 'oboSecondScreen.farewell.title';

  readonly #qrGeneratorService = inject(QrGeneratorService);
  readonly #sanitizeService = inject(SanitizeService);

  protected readonly bannerCardState = BannerCardState;

  readonly logo = input<string>('assets/images/logos/fever-logo.svg');
  readonly partnerState = input.required<OboSecondScreenPartnerState>();
  /** The configuration the POS stored; `null` keeps the per-partner hardcoded branding. */
  readonly configuration = input<SecondScreenConfiguration | null>(null);
  readonly state = input.required<BannerCardState>();

  /** The configuration logo when it has one; otherwise the partner logo of the `logo` input (brand, country or Fever's). */
  protected readonly bannerLogo = computed(() => toFilledValue(this.configuration()?.logo_url) ?? this.logo());
  /** The configuration QR URL when it parses; `null` leaves the partner's current QR, so an unset field changes nothing. */
  readonly #configurationQrUrl = computed(() => {
    const url = toFilledValue(this.configuration()?.qr_url);
    return url !== null && getUrlHost(url) !== null ? url : null;
  });
  /** The URL the QR encodes. */
  protected readonly qrUrl = computed(() => this.#configurationQrUrl() ?? resolvePartnerQrUrl(this.partnerState()));
  /** The URL shown under the QR and in the farewell line: the host of the configuration URL, or the partner's own text. */
  protected readonly displayedUrl = computed(() => {
    const url = this.#configurationQrUrl();
    return (url === null ? null : getUrlHost(url)) ?? resolvePartnerUrl(this.partnerState());
  });
  /** The farewell line is a translation rendered as HTML: the host goes in escaped, so it always renders as text. */
  protected readonly farewellUrl = computed(() => this.#sanitizeService.escapeHtml(this.displayedUrl()));
  /** Without a configuration title, the partner's current standby title. */
  protected readonly titleKey = computed(() =>
    this.state() === BannerCardState.Farewell ? BannerCardComponent.farewellTitleKey : resolvePartnerStandbyTitleKey(this.partnerState()),
  );
  /** A literal standby title from the configuration, which wins over the translated key. */
  protected readonly configurationTitle = computed<string | null>(() =>
    this.state() === BannerCardState.StandBy ? toFilledValue(this.configuration()?.standby_title) : null,
  );
  protected readonly showQr = computed(() => this.state() === BannerCardState.StandBy);
  protected readonly showFarewellDescription = computed(() => this.state() === BannerCardState.Farewell);
  /** QR rendering is best-effort: a failure keeps the empty placeholder. */
  protected readonly code = toSignal(
    toObservable(this.qrUrl).pipe(switchMap(url => from(this.#qrGeneratorService.generateQr(url)).pipe(catchError(() => of(''))))),
    { initialValue: '' },
  );
}
