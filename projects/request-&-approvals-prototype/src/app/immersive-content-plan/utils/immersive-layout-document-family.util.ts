import { isSupportedModuleType } from '../models/immersive-layout-descriptor.registry';
import type { ImmersiveLayoutDocument } from '../models/immersive-layout-document.model';

export type LayoutDocumentFamily = 'empty' | 'immersive' | 'unsupported';

// The registry's single support rule folded over the document: landing-* and unknown types have no
// descriptor, so both fail the family closed instead of passing as immersive.
export function deriveDocumentFamily(document: ImmersiveLayoutDocument | null): LayoutDocumentFamily {
  if (document === null || document.schema.modules.length === 0) {
    return 'empty';
  }

  return document.schema.modules.every(module => isSupportedModuleType(module.type)) ? 'immersive' : 'unsupported';
}

export function isPublishableDocumentFamily(family: LayoutDocumentFamily): boolean {
  return family === 'immersive';
}
