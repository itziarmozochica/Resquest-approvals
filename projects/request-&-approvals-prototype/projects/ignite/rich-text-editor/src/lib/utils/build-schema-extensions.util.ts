import type { AnyExtension } from '@tiptap/core';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Link } from '@tiptap/extension-link';
import { Underline } from '@tiptap/extension-underline';

import { IgntRichTextEditorImage } from '../extensions/rich-text-editor-image.extension';
import { buildParagraphExtension } from '../extensions/rich-text-editor-paragraph.extension';
import { buildTextAlignExtension } from '../extensions/rich-text-editor-text-align.extension';
import type { IgntRichTextEditorFeature } from '../models/enums/rich-text-editor-feature.enum';
import type { IgntRichTextEditorSchemaOptions } from '../models/rich-text-editor-schema-options.model';
import { buildCoreExtensions } from './build-core-extensions.util';
import { isValidLinkUrl } from './validate-link-url.util';

const SAFE_LINK_REL = 'noopener noreferrer';

export function isFeatureEnabled(features: ReadonlySet<IgntRichTextEditorFeature>, feature: IgntRichTextEditorFeature): boolean {
  return features.has(feature);
}

function buildLinkExtension(): AnyExtension {
  return Link.extend({
    // The DOM `rel` is not read, so the configured one cannot be overridden by stored markup.
    addAttributes() {
      return {
        ...this.parent?.(),
        rel: { default: SAFE_LINK_REL, parseHTML: (): null => null },
      };
    },
  }).configure({
    enableClickSelection: false,
    HTMLAttributes: {
      rel: SAFE_LINK_REL,
      target: '_blank',
    },
    openOnClick: false,
    isAllowedUri: (url: string) => isValidLinkUrl(url),
    shouldAutoLink: (url: string) => isValidLinkUrl(url),
  });
}

function buildImageExtension(imageResizeEnabled: boolean, allowBase64: boolean): AnyExtension {
  if (!imageResizeEnabled) {
    return IgntRichTextEditorImage.configure({
      allowBase64,
    });
  }

  return IgntRichTextEditorImage.configure({
    allowBase64,
    resize: {
      alwaysPreserveAspectRatio: true,
      enabled: true,
      minHeight: 50,
      minWidth: 50,
    },
  });
}

function buildCharacterCountExtension(characterLimit?: number | null): AnyExtension {
  return CharacterCount.configure({
    limit: characterLimit ?? undefined,
  });
}

/**
 * The schema: what stored content can be read as, and nothing a caret or a toolbar needs.
 *
 * It lives apart from {@link buildExtensionsFromFeatures} because the emoji and file-handler
 * extensions that builder reaches for are static imports of ~600 KB, and a runtime feature flag
 * does not tree-shake. A read-only surface builds from here and ships neither.
 */
export function buildSchemaExtensions(options: IgntRichTextEditorSchemaOptions): AnyExtension[] {
  return [
    ...buildCoreExtensions(),
    buildParagraphExtension(options.blockTag),
    buildCharacterCountExtension(options.characterLimit),
    // Preservation baseline: always in the schema so legacy content is not dropped on load.
    // Authoring stays gated by the feature set (no toolbar buttons added here).
    buildLinkExtension(),
    buildTextAlignExtension(),
    Underline,
    buildImageExtension(options.imageResizeEnabled, options.allowBase64),
  ];
}
