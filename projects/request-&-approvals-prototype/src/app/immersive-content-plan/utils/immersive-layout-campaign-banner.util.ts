import type { ImmersiveLayoutDocument, ImmersiveLayoutValue } from '../models/immersive-layout-document.model';
import type { ImmersiveModuleType } from '../models/immersive-layout-module-type.model';
import { findEditableModule, resolveDocumentPropPath } from './immersive-layout-general-settings.util';
import { omitAtPath } from './immersive-layout-patch.util';
import { omitTokenTranslations, patchModuleProp } from './immersive-layout-working.util';

const campaignBannerType: ImmersiveModuleType = 'immersive-campaign-banner';
const customTemplate = 'custom';
const templateProp = 'template';
const openInNewTabProp = 'openInNewTab';

export function isCampaignBannerTemplate(layout: ImmersiveLayoutDocument, moduleId: string, propPath: string): boolean {
  return propPath === templateProp && findEditableModule(layout, moduleId)?.type === campaignBannerType;
}

// The preset (or no template) shows nothing but the template, so switching to it drops every other
// banner prop together with the copy of its tokens. Switching to `custom` opens the link in a new
// tab by default, without overriding a value the banner already holds.
export function applyCampaignBannerTemplate<T extends ImmersiveLayoutDocument>(
  layout: T,
  moduleId: string,
  template: ImmersiveLayoutValue,
): T {
  const module = findEditableModule(layout, moduleId);
  if (module === null) {
    return layout;
  }
  const withTemplate = patchModuleProp(layout, moduleId, templateProp, template);

  if (template === customTemplate) {
    return module.props[openInNewTabProp] === undefined ? patchModuleProp(withTemplate, moduleId, openInNewTabProp, true) : withTemplate;
  }

  return Object.entries(module.props)
    .filter(([name]) => name !== templateProp)
    .reduce((current, [name, value]) => omitProp(current, moduleId, name, value), withTemplate);
}

function omitProp<T extends ImmersiveLayoutDocument>(layout: T, moduleId: string, name: string, value: ImmersiveLayoutValue): T {
  const path = resolveDocumentPropPath(layout, moduleId, name);
  return path === null ? layout : omitTokenTranslations(omitAtPath(layout, path), value);
}
