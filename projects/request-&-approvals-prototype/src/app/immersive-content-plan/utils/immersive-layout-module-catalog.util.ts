import {
  getDescriptor,
  isHiddenModuleType,
  isNonAddableModuleType,
  isSupportedModuleType,
} from '../models/immersive-layout-descriptor.registry';
import { immersiveModuleTypes, type ImmersiveModuleType } from '../models/immersive-layout-module-type.model';

export interface AddableModuleCatalogEntry {
  label: string;
  type: ImmersiveModuleType;
}

// Every immersive type the editor can represent, minus the ones `buildModuleListViews` already keeps
// out of sight (product-hidden) and minus the ones a document may never gain a second — or a first —
// instance of through the picker (non-addable).
export function isAddableModuleType(type: string): boolean {
  return isSupportedModuleType(type) && !isHiddenModuleType(type) && !isNonAddableModuleType(type);
}

// The "Add module" picker's menu: every addable type the layout does not carry yet, so a module is
// never added twice. Declaration order is `immersiveModuleTypes`' own, so the menu never needs a
// sort rule of its own.
export function buildAddableModuleCatalog(presentTypes: ReadonlySet<string>): AddableModuleCatalogEntry[] {
  return immersiveModuleTypes
    .filter(type => isAddableModuleType(type) && !presentTypes.has(type))
    .map(type => ({ label: getDescriptor(type)?.label ?? type, type }));
}
