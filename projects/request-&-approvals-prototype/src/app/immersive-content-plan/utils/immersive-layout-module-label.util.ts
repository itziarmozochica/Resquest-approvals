import { getDescriptor } from '../models/immersive-layout-descriptor.registry';
import type { ImmersiveLayoutModule, ImmersiveLayoutTranslations } from '../models/immersive-layout-document.model';
import { resolveTokenLabel } from './immersive-layout-locale.util';

// Production layouts carry webclient app-i18n keys in `navbarLabelKey` (e.g.
// `immersivePlan.highlights.navbar`), which are never present in the document translations.
export function resolveModuleLabel(
  module: ImmersiveLayoutModule,
  translations: ImmersiveLayoutTranslations,
  baseLocale: string | null,
): string {
  return (
    (module.navbarLabelKey ? resolveTokenLabel(translations, module.navbarLabelKey, baseLocale) : null) ??
    getDescriptor(module.type)?.label ??
    module.type
  );
}
