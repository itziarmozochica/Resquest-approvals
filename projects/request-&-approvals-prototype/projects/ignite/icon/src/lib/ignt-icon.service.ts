import { inject, Injectable } from '@angular/core';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  IconDefinition as ThirdPartyIconDefinition,
  icon as thirdPartyIconLookup,
  IconPrefix as ThirdPartyIconPrefix,
} from '@fortawesome/fontawesome-svg-core';

import { IgntIconParams } from './interfaces/ignt-icon-params';
import { IgntIconDefinition } from './interfaces/ignt-icon-rendered';
import { IgntIconVariant } from './interfaces/ignt-icon-variant';
import { IgntIconName } from './interfaces/ignt-icon.name';
import { brandIcons } from './sets/brand-icons';
import { duotoneIcons } from './sets/duotone-icons';
import { lightIcons } from './sets/light-icons';
import { regularIcons } from './sets/regular-icons';
import { solidIcons } from './sets/solid-icons';

/**
 * @internal
 */
@Injectable({ providedIn: 'root' })
export class IgntIconService {
  readonly #faIconLibrary = inject(FaIconLibrary);
  readonly #cache = new Map<string, ThirdPartyIconDefinition>();

  getIconDefinition(name: string, variant: IgntIconVariant, params: IgntIconParams = {}): IgntIconDefinition | null {
    const cacheKey = `${name}-${variant}`;
    let thirdPartyIconDef: ThirdPartyIconDefinition | null = this.#cache.get(cacheKey) ?? null;

    if (thirdPartyIconDef === null) {
      thirdPartyIconDef = this.#fetchIconDefinition(name, variant);
      if (thirdPartyIconDef !== null) {
        this.#cache.set(cacheKey, thirdPartyIconDef);
      }
    }

    return thirdPartyIconDef ? this.#renderIcon(thirdPartyIconDef, variant, params) : null;
  }

  /**
   * To be removed once the old approach "<fa-icon>" has been fully migrated to "<ignt-icon>".
   *
   * Once the old approach "<fa-icon>" has been fully migrated to "<ignt-icon>",
   * we can prevent fontawesome to load their styles and rely on our owns. It would reduce bundle size.
   *
   * readonly #faConfig = inject(FaConfig);``
   * this.#faConfig.autoAddCss = false; (consider classes like 'fa-fw' and 'fa-spin' to be added to the icon)
   *
   * Morevover, we could lazy-load icon sets as needed, avoiding to load all of them at once.
   * Following that, we would be able to remove this method and adjust 'fetchIconDefinition' method accordingly.
   *
   * @deprecated
   */
  preloadAllSets(): void {
    this.#faIconLibrary.addIcons(
      ...Object.values(brandIcons),
      ...Object.values(regularIcons),
      ...Object.values(lightIcons),
      ...Object.values(duotoneIcons),
      ...Object.values(solidIcons),
    );
  }

  #fetchIconDefinition(name: string, variant: IgntIconVariant): ThirdPartyIconDefinition | null {
    const thirdPartyIconDef: ThirdPartyIconDefinition | null = this.#faIconLibrary.getIconDefinition(
      this.#getThirdPartyPrefix(variant),
      name,
    ) as ThirdPartyIconDefinition | null;

    if (thirdPartyIconDef === null) {
      console.warn(`Ignt: Icon ${name} not found`);
    }
    return thirdPartyIconDef;
  }

  #getCSSClasses(params: IgntIconParams): string[] {
    const classes: string[] = [];
    if (params.fixedWidth) {
      classes.push('fa-fw');
    }
    if (params.spin) {
      classes.push('fa-spin');
    }
    return classes;
  }

  #getThirdPartyPrefix(variant: IgntIconVariant): ThirdPartyIconPrefix {
    switch (variant) {
      case 'brand':
        return 'fab';
      case 'regular':
        return 'far';
      case 'light':
        return 'fal';
      case 'duotone':
        return 'fad';
      default:
        return 'fas';
    }
  }

  #renderIcon(iconDef: ThirdPartyIconDefinition, variant: IgntIconVariant, params: IgntIconParams): IgntIconDefinition {
    const classes: string[] = this.#getCSSClasses(params);
    const svg = thirdPartyIconLookup(iconDef, { classes }).html.join('\n');
    return {
      name: iconDef.iconName as IgntIconName,
      svg,
      variant,
    };
  }
}
