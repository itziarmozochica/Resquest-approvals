import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';

import packageJson from '../../../../../package.json';
import { DualScreenStorageService } from '../dual-screen/dual-screen-storage.service';
import { PatnerIconLoaderService } from '../partner-icon/partner-icon.service';

type ConditionalTheme = {
  className: string;
  shouldApply: () => boolean;
};

/**
 * Themes the app for the active partner, in two ways:
 *
 * - **Brand (the only valid approach).** The partner's design-token brand (`brand-<name>.css`) is
 *   linked over the global feverzone-legacy brand, and styles read its `--fv-*` custom properties.
 *   New partner styling goes into the partner's brand in `projects/ignite/theme/tokens/brand/`.
 * - **Root class (legacy).** The `patrimonio`, `caixa` and `onebox-theme` classes and their Sass
 *   mixins in `src/theme/abstracts/mixins/themes/` stay only until the styles they cover read the
 *   tokens. Never extend them.
 */
@Injectable({
  providedIn: 'root',
})
export class PartnerThemeLoaderService {
  readonly #brandLinkId = 'fv-brand';
  /**
   * The design-token brand of each theme class. Each brand is built as `brand-<name>.css`
   * (`inject: false` in angular.json) and linked after the global feverzone-legacy brand,
   * so its `--fv-*` values win.
   */
  readonly #brands = new Map<string, string>([
    ['caixa', 'caixa-b2b'],
    ['onebox-theme', 'onebox-b2b'],
    ['patrimonio', 'patrimonio-b2b'],
  ]);
  /**
   * Conditional themes are applied based on runtime conditions (localStorage, etc.)
   * rather than partner ID. They serve as fallback themes when no partner-specific theme is found.
   *
   * To test a conditional theme:
   * - Set the required condition (e.g., localStorage.setItem(StorageKey.oneboxLogin, 'true'))
   * - Login with a non-themeable partner (any ID not in #themeblePartners)
   *
   * To add a new conditional theme:
   * - Add entry to this array with className and shouldApply condition
   * - Map its className to its design-token brand in #brands and add the brand's bundle to angular.json
   * - Do not create a Sass theme mixin: root-class styling is legacy
   */
  #conditionalThemes: ConditionalTheme[] = [
    {
      className: 'onebox-theme',
      shouldApply: () => localStorage.getItem(StorageKey.oneboxLogin) === 'true',
    },
  ];
  readonly #document = inject(DOCUMENT);
  readonly #dualScreenStorageService = inject(DualScreenStorageService);
  #dynamicBrandDisabled = false;
  readonly #patnerIconLoaderService = inject(PatnerIconLoaderService);
  #themeblePartners = new Map<number, string>([
    [12759, 'patrimonio'],
    [13914, 'caixa'],
  ]);

  /**
   * Temporary workaround that keeps kiosk routes on the global feverzone-legacy brand. Disables the
   * partner's brand link, and every brand link added later in the session, so the brand file is
   * neither downloaded nor applied. There is no way back: the kiosk route flag it follows never resets.
   *
   * Only `AppComponent`'s kiosk route detection may call it. Remove it once the kiosk app is isolated
   * with its own main brand file.
   */
  disableDynamicBrand(): void {
    this.#dynamicBrandDisabled = true;
    this.#document.getElementById(this.#brandLinkId)?.setAttribute('disabled', '');
  }

  init(prevId: number | null, id: number | null): void {
    if (prevId === id) {
      return;
    }
    this.#resetTheming();
    /**
     * Replace the `#themeblePartners` key to get
     * in order to test any themeble partner theme you like.
     *
     * @example:
     *
     * ```ts
     * // For "patrimonio":
     * const themeblePartnerAlias = (this.#themeblePartners.get(12759) as string | undefined) ?? '';
     * ```
     */
    const themablePartnerAlias: string = id !== null ? ((this.#themeblePartners.get(id) as string | undefined) ?? '') : '';
    const suppressPatrimonioPartnerBodyThemeForDualScreen: boolean = this.#shouldSuppressPartnerThemeForDualScreenInPatrimonioNacional(id);
    if (themablePartnerAlias.length > 0 && !suppressPatrimonioPartnerBodyThemeForDualScreen) {
      this.#addTheme(themablePartnerAlias);
      this.#patnerIconLoaderService.setIcon(id);
    } else {
      const conditionalTheme: ConditionalTheme | undefined = this.#conditionalThemes.find((theme: ConditionalTheme) => theme.shouldApply());
      if (conditionalTheme) {
        this.#addTheme(conditionalTheme.className);
      }
      if (prevId !== null && id !== null) {
        this.#patnerIconLoaderService.setIcon(null);
      }
    }
  }

  #addBrand(brand: string): void {
    const link: HTMLLinkElement = this.#document.createElement('link');
    link.id = this.#brandLinkId;
    link.rel = 'stylesheet';
    // The bundle name carries no content hash, so the app version busts the cache.
    link.href = `brand-${brand}.css?v=${packageJson.version}`;
    link.toggleAttribute('disabled', this.#dynamicBrandDisabled);
    this.#document.head.append(link);
  }

  #addTheme(themeblePartnerAlias: string): void {
    this.#document.documentElement.classList.add(themeblePartnerAlias);
    const brand: string | undefined = this.#brands.get(themeblePartnerAlias);
    if (brand !== undefined) {
      this.#addBrand(brand);
    }
  }

  #removeTheme(themeblePartnerAlias: string): void {
    this.#document.documentElement.classList.remove(themeblePartnerAlias);
  }

  #resetTheming(): void {
    this.#themeblePartners.forEach((themeblePartnerAlias: string) => this.#removeTheme(themeblePartnerAlias));
    this.#conditionalThemes.forEach((theme: ConditionalTheme) => this.#removeTheme(theme.className));
    this.#document.getElementById(this.#brandLinkId)?.remove();
  }

  #shouldSuppressPartnerThemeForDualScreenInPatrimonioNacional(partnerId: number | null): boolean {
    return partnerId === 12759 && this.#dualScreenStorageService.containsData();
  }
}
