import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { Router } from '@angular/router';

import { SUPPORTED_LANGUAGES } from '@fz-original/app/shared/constants/supported-translations-languages';
import { translationRevisionSignal } from '@fz-original/app/shared/utils/translation-revision.signal.util';
import { IGNT_DIALOG_REF, IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

const I18N_PREFIX = 'reservations.depositsAnnouncement';

const DEPOSIT_SETTINGS_ROUTE = '/reservations/deposit-settings';

const VISUAL_BASE_PATH = 'assets/images/reservations/deposits-announcement-panel';

const FALLBACK_VISUAL_LANGUAGE = 'en';

/**
 * The help-centre article, as a translation key rather than a constant.
 *
 * Zendesk serves the guide per locale — the footer already links `footer.feverzoneGuide.url`
 * that way — so a URL hardcoded here would send every partner to the English docs. Keeping it
 * in `en.json` alongside the rest of this modal's copy means the localised URLs arrive with
 * the translations instead of needing a code change.
 */
const LEARN_MORE_URL_KEY = `${I18N_PREFIX}.learnMoreUrl`;

const BENEFIT_KEYS = [
  `${I18N_PREFIX}.benefits.secureRevenue`,
  `${I18N_PREFIX}.benefits.reduceNoShows`,
  `${I18N_PREFIX}.benefits.depositRules`,
  `${I18N_PREFIX}.benefits.managePayments`,
] as const;

/**
 * One-time announcement modal promoting the reservations deposits feature.
 *
 * Rendered as the content of an Ignite dialog: every control dismisses the
 * dialog through the injected {@link IGNT_DIALOG_REF}. The primary CTA also
 * navigates to the deposit settings; "Learn more" exposes an output for the
 * host to decide where to go (destination pending).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IgntButtonComponent, IgntIconButtonComponent, IgntIconComponent],
  selector: 'app-deposits-announcement',
  standalone: true,
  styleUrl: './deposits-announcement.component.scss',
  templateUrl: './deposits-announcement.component.html',
})
export class DepositsAnnouncementComponent {
  readonly #dialogRef = inject(IGNT_DIALOG_REF);
  readonly #router = inject(Router);
  readonly #translate = inject(TranslateService);
  readonly #translationRevision = translationRevisionSignal(this.#translate);

  /**
   * Emitted when the "Learn more" link is activated.
   *
   * A notification, not the navigation: the component opens the guide itself, the same way
   * the primary CTA routes itself. `product-marketing` does not subscribe to component
   * outputs, so nothing consumes this today — it is here for a host that wants to track the
   * click.
   */
  readonly learnMore = output<void>();

  protected readonly i18nPrefix = I18N_PREFIX;
  protected readonly benefitKeys = BENEFIT_KEYS;

  protected readonly visual = computed(() => {
    this.#translationRevision();
    const language = SUPPORTED_LANGUAGES.includes(this.#translate.currentLang) ? this.#translate.currentLang : FALLBACK_VISUAL_LANGUAGE;

    return {
      large: `${VISUAL_BASE_PATH}-large-${language}.png`,
      medium: `${VISUAL_BASE_PATH}-medium-${language}.png`,
    };
  });

  protected onClose(): void {
    this.#dialogRef.close();
  }

  protected onLearnMore(): void {
    this.learnMore.emit();
    // `noopener,noreferrer`: without it the guide gets a handle on this tab through
    // `window.opener` and could navigate it away.
    window.open(this.#translate.instant(LEARN_MORE_URL_KEY), '_blank', 'noopener,noreferrer');
    this.#dialogRef.close();
  }

  protected onPrimaryClick(): void {
    this.#dialogRef.close();
    // `merge` keeps the selected-plan context, as every other entry point to this route does.
    void this.#router.navigate([DEPOSIT_SETTINGS_ROUTE], { queryParamsHandling: 'merge' });
  }
}
