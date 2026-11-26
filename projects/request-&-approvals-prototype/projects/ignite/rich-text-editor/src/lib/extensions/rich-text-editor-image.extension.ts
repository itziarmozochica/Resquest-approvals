import { mergeAttributes, ResizableNodeView, type ResizableNodeViewDirection } from '@tiptap/core';
import { Image as BaseImage, inputRegex } from '@tiptap/extension-image';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

import { isDataUri, isValidImageDataUri } from '../utils/file.util';

export type IgntRichTextEditorImageAlign = 'center' | 'left' | 'right' | null;
export type IgntRichTextEditorImageWidthMode = 'auto' | 'full' | null;

const IMAGE_ALIGN_STYLES: Record<Exclude<IgntRichTextEditorImageAlign, null>, string> = {
  center: 'display:block;margin:auto;',
  left: 'display:block;margin-right:auto;margin-left:0;',
  right: 'display:block;margin-left:auto;margin-right:0;',
};

const IMAGE_FULL_WIDTH_STYLE = 'width:100%;height:auto;max-width:100%;display:block;';

export function parseImageAlignFromStyle(style: string | null): IgntRichTextEditorImageAlign {
  if (style === null || style === '') {
    return null;
  }

  const normalizedStyle = style.replace(/\s/gu, '').toLowerCase();

  if (!normalizedStyle.includes('display:block')) {
    return null;
  }

  const hasMarginLeftAuto = normalizedStyle.includes('margin-left:auto');
  const hasMarginRightAuto = normalizedStyle.includes('margin-right:auto');
  const isCentered =
    normalizedStyle.includes('margin:auto') || normalizedStyle.includes('margin:0auto') || (hasMarginLeftAuto && hasMarginRightAuto);

  if (isCentered) {
    return 'center';
  }

  if (hasMarginLeftAuto) {
    return 'right';
  }

  if (hasMarginRightAuto) {
    return 'left';
  }

  return null;
}

export function parseImageWidthModeFromStyle(style: string | null): IgntRichTextEditorImageWidthMode {
  if (style === null || style === '') {
    return null;
  }

  const normalizedStyle = style.replace(/\s/gu, '').toLowerCase();

  if (normalizedStyle.includes('width:100%')) {
    return 'full';
  }

  return null;
}

/** Legacy content centres an image by wrapping it in `<center>` rather than by styling it. */
function parseImageAlign(element: HTMLElement): IgntRichTextEditorImageAlign {
  const styleAlign = parseImageAlignFromStyle(element.getAttribute('style'));

  if (styleAlign !== null) {
    return styleAlign;
  }

  return element.closest('center') === null ? null : 'center';
}

export function renderImageAlignStyle(imageAlign: IgntRichTextEditorImageAlign): string | null {
  if (!imageAlign) {
    return null;
  }

  return IMAGE_ALIGN_STYLES[imageAlign];
}

export function renderImageWidthStyle(imageWidthMode: IgntRichTextEditorImageWidthMode): string | null {
  if (imageWidthMode !== 'full') {
    return null;
  }

  return IMAGE_FULL_WIDTH_STYLE;
}

export function mergeImageStyles(
  imageAlign: IgntRichTextEditorImageAlign,
  imageWidthMode: IgntRichTextEditorImageWidthMode,
): string | null {
  if (imageWidthMode === 'full') {
    return renderImageWidthStyle('full');
  }

  return renderImageAlignStyle(imageAlign);
}

function applyImageAlignToResizeContainer(container: HTMLElement, imageAlign: IgntRichTextEditorImageAlign): void {
  if (imageAlign === 'center') {
    container.style.justifyContent = 'center';
    container.dataset.imageAlign = 'center';

    return;
  }

  if (imageAlign === 'left') {
    container.style.justifyContent = 'flex-start';
    container.dataset.imageAlign = 'left';

    return;
  }

  if (imageAlign === 'right') {
    container.style.justifyContent = 'flex-end';
    container.dataset.imageAlign = 'right';

    return;
  }

  container.style.justifyContent = '';
  delete container.dataset.imageAlign;
}

export function applyImageWidthModeToResizeContainer(container: HTMLElement, imageWidthMode: IgntRichTextEditorImageWidthMode): void {
  const wrapper = container.querySelector<HTMLElement>('[data-resize-wrapper]');

  if (imageWidthMode === 'full') {
    container.dataset.imageWidth = 'full';
    container.style.width = '100%';
    container.style.justifyContent = 'stretch';

    if (wrapper) {
      wrapper.style.width = '100%';
    }

    return;
  }

  container.style.width = '';
  delete container.dataset.imageWidth;

  if (wrapper) {
    wrapper.style.width = '';
  }
}

export function applyImageElementDimensions(
  element: HTMLImageElement,
  imageWidthMode: IgntRichTextEditorImageWidthMode,
  width: number | null | undefined,
  height: number | null | undefined,
): void {
  if (imageWidthMode === 'full') {
    element.style.width = '100%';
    element.style.height = 'auto';

    return;
  }

  if (width !== null && width !== undefined) {
    element.style.width = `${width}px`;
  } else {
    element.style.width = '';
  }

  if (height !== null && height !== undefined) {
    element.style.height = `${height}px`;
  } else {
    element.style.height = '';
  }
}

interface ImageNodeViewLayoutOptions {
  container: HTMLElement;
  element: HTMLImageElement;
  height: number | null | undefined;
  imageAlign: IgntRichTextEditorImageAlign;
  imageWidthMode: IgntRichTextEditorImageWidthMode;
  width: number | null | undefined;
}

function applyImageNodeViewLayout(options: ImageNodeViewLayoutOptions): void {
  const { container, element, height, imageAlign, imageWidthMode, width } = options;
  applyImageWidthModeToResizeContainer(container, imageWidthMode);

  if (imageWidthMode !== 'full') {
    applyImageAlignToResizeContainer(container, imageAlign);
  }

  applyImageElementDimensions(element, imageWidthMode, width, height);
}

export const IgntRichTextEditorImage = BaseImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      imageAlign: {
        default: null,
        rendered: false,
        parseHTML: (element: HTMLElement) => parseImageAlign(element),
      },
      imageWidthMode: {
        default: null,
        rendered: false,
        parseHTML: (element: HTMLElement) => parseImageWidthModeFromStyle(element.getAttribute('style')),
      },
    };
  },

  addNodeView() {
    const resizeConfig = this.options.resize;

    if (resizeConfig === false || resizeConfig.enabled !== true || typeof document === 'undefined') {
      return null;
    }

    const alwaysPreserveAspectRatio: boolean | undefined = resizeConfig.alwaysPreserveAspectRatio;
    const directions: ResizableNodeViewDirection[] | undefined = resizeConfig.directions;
    const minHeight: number | undefined = resizeConfig.minHeight;
    const minWidth: number | undefined = resizeConfig.minWidth;

    return ({ editor, getPos, HTMLAttributes, node }) => {
      const element = document.createElement('img');
      element.draggable = false;

      const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);

      Object.entries(mergedAttributes).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          switch (key) {
            case 'height':
            case 'width':
              break;
            default:
              element.setAttribute(key, value as string);
              break;
          }
        }
      });

      if (mergedAttributes.src !== null && mergedAttributes.src !== undefined) {
        element.src = mergedAttributes.src as string;
      }

      let hasExitedFullWidthOnResize = false;
      const containerState: { element: HTMLElement | null } = { element: null };

      const nodeView = new ResizableNodeView({
        editor,
        element,
        getPos,
        node,
        options: {
          directions,
          min: {
            height: minHeight,
            width: minWidth,
          },
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
        },
        onCommit: (width: number, height: number) => {
          const pos = getPos();

          if (pos === undefined) {
            return;
          }

          this.editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes(this.name, {
              height,
              imageWidthMode: null,
              width,
            })
            .run();
        },
        onResize: (width: number, height: number) => {
          if (hasExitedFullWidthOnResize) {
            applyImageElementDimensions(element, null, width, height);

            return;
          }

          const pos = getPos();

          if (pos === undefined) {
            applyImageElementDimensions(element, null, width, height);

            return;
          }

          const currentNode = editor.state.doc.nodeAt(pos);
          const imageWidthMode = currentNode?.attrs.imageWidthMode as IgntRichTextEditorImageWidthMode | undefined;

          if (imageWidthMode === 'full') {
            hasExitedFullWidthOnResize = true;
            editor.chain().setNodeSelection(pos).updateAttributes(this.name, { imageWidthMode: null }).run();

            if (containerState.element !== null) {
              applyImageWidthModeToResizeContainer(containerState.element, null);
            }
          }

          applyImageElementDimensions(element, null, width, height);
        },
        onUpdate: (updatedNode: ProseMirrorNode) => {
          if (updatedNode.type !== node.type) {
            return false;
          }

          if (containerState.element === null) {
            return false;
          }

          applyImageNodeViewLayout({
            container: containerState.element,
            element,
            height: updatedNode.attrs.height as number | null | undefined,
            imageAlign: updatedNode.attrs.imageAlign as IgntRichTextEditorImageAlign,
            imageWidthMode: updatedNode.attrs.imageWidthMode as IgntRichTextEditorImageWidthMode,
            width: updatedNode.attrs.width as number | null | undefined,
          });

          return true;
        },
      });

      containerState.element = nodeView.dom;

      const container = containerState.element;

      applyImageNodeViewLayout({
        container,
        element,
        height: node.attrs.height as number | null | undefined,
        imageAlign: node.attrs.imageAlign as IgntRichTextEditorImageAlign,
        imageWidthMode: node.attrs.imageWidthMode as IgntRichTextEditorImageWidthMode,
        width: node.attrs.width as number | null | undefined,
      });

      container.style.visibility = 'hidden';
      container.style.pointerEvents = 'none';
      element.onload = () => {
        container.style.visibility = '';
        container.style.pointerEvents = '';
      };

      return nodeView;
    };
  },

  parseHTML() {
    return [
      {
        tag: this.options.allowBase64 ? 'img[src]' : 'img[src]:not([src^="data:"])',
        getAttrs: (element: HTMLElement) => {
          const src = element.getAttribute('src');

          return src !== null && isDataUri(src) && !isValidImageDataUri(src) ? false : null;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const imageAlign = node.attrs.imageAlign as IgntRichTextEditorImageAlign;
    const imageWidthMode = node.attrs.imageWidthMode as IgntRichTextEditorImageWidthMode;
    const mergedStyle = mergeImageStyles(imageAlign, imageWidthMode);
    const restAttributes = { ...HTMLAttributes };
    delete restAttributes.style;
    const attributesWithStyle = mergedStyle !== null && mergedStyle !== '' ? { ...restAttributes, style: mergedStyle } : restAttributes;

    if (imageWidthMode === 'full') {
      delete attributesWithStyle.width;
      delete attributesWithStyle.height;
    }

    return ['img', mergeAttributes(this.options.HTMLAttributes, attributesWithStyle)];
  },
});

export { inputRegex };
