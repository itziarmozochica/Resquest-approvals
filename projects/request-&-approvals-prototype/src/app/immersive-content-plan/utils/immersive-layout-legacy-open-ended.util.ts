import type { ImmersiveLayoutDocument, ImmersiveLayoutModule } from '../models/immersive-layout-document.model';
import { HERO_MODULE_TYPE } from '../models/immersive-layout-module-type.model';
import { omitAtPath } from './immersive-layout-patch.util';

const OPEN_ENDED_PROP = 'isOpenEnded';

// `isOpenEnded` was a boolean until the backend made it a translatable string and started
// rejecting booleans on every write. A hero saved in between still holds one, and would block
// the patch of any module, so it never leaves the editor: absent is the off state it stood for.
// Returns the very same document when there is nothing to drop.
export function dropLegacyBooleanOpenEnded<T extends ImmersiveLayoutDocument>(layout: T): T {
  if (!layout.schema.modules.some(hasLegacyBooleanOpenEnded)) {
    return layout;
  }
  const modules = layout.schema.modules.map(module =>
    hasLegacyBooleanOpenEnded(module) ? { ...module, props: omitAtPath(module.props, [OPEN_ENDED_PROP]) } : module,
  );
  return { ...layout, schema: { ...layout.schema, modules } };
}

function hasLegacyBooleanOpenEnded(module: ImmersiveLayoutModule): boolean {
  return module.type === HERO_MODULE_TYPE && typeof module.props?.[OPEN_ENDED_PROP] === 'boolean';
}
