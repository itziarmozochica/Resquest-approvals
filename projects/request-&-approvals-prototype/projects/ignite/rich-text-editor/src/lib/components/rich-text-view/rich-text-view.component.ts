import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import { Editor } from '@tiptap/core';

import { IgntRichTextEditorBlockTag } from '../../models/enums/rich-text-editor-block-tag.enum';
import { buildSchemaExtensions } from '../../utils/build-schema-extensions.util';

/**
 * Rich text as the editor stored it, rendered read-only.
 *
 * The HTML is parsed by the same schema the editor writes with, so what the editor can produce is
 * what this renders, and anything outside that schema is dropped rather than trusted.
 *
 * ### When to use
 * - Showing copy an author wrote in `IgntRichTextEditorComponent` on a screen that cannot edit it
 * - Rendering stored rich text whose dialect predates the current editor
 *
 * ### When NOT to use
 * - The text can be edited → `IgntRichTextEditorComponent` with `readonly` for a locked field
 * - The value is plain text → interpolate it
 *
 * ### Related
 * - [Rich Text Editor](?path=/docs/components-fields-rich-text-editor--docs) — the authoring surface
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  selector: 'ignt-rich-text-view',
  standalone: true,
  styleUrl: './rich-text-view.component.scss',
  templateUrl: './rich-text-view.component.html',
})
export class IgntRichTextViewComponent {
  /** The stored rich text to render. Anything the editor's schema does not recognise is dropped. */
  readonly html = input<string>('');

  protected readonly content = viewChild.required<ElementRef<HTMLElement>>('content');
  #editor: Editor | null = null;

  constructor() {
    effect(() => {
      const html = this.html();
      this.#render(html);
    });

    inject(DestroyRef).onDestroy(() => {
      this.#editor?.destroy();
      this.#editor = null;
    });
  }

  #render(html: string): void {
    if (this.#editor === null) {
      this.#editor = new Editor({
        content: html,
        editable: false,
        editorProps: {
          // ProseMirror dresses its element as a field. This is body copy: no textbox for a screen
          // reader to announce, and translatable like the rest of the page.
          attributes: {
            role: 'presentation',
            translate: 'yes',
          },
        },
        element: this.content().nativeElement,
        extensions: buildSchemaExtensions({
          allowBase64: true,
          blockTag: IgntRichTextEditorBlockTag.P,
          characterLimit: null,
          imageResizeEnabled: false,
        }),
      });

      return;
    }

    this.#editor.commands.setContent(html);
  }
}
