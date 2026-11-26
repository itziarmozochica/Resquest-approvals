import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

import { IgntTooltipDirective } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Editor } from '@tiptap/core';
import { Placeholder } from '@tiptap/extension-placeholder';

import { IMMERSIVE_MARKDOWN_EXTENSIONS } from '../../extensions/immersive-markdown.extensions';
import { IMMERSIVE_MARKDOWN_TOOLBAR_ITEMS, type ImmersiveMarkdownFormat } from '../../models/immersive-markdown-editor.model';
import { descriptionMarkdownToDoc, docToDescriptionMarkdown } from '../../utils/immersive-description-markdown.util';
import {
  canonicaliseEditorContent,
  loadMarkdownIntoEditor,
  readActiveMarkdownFormats,
  toggleMarkdownFormat,
} from '../../utils/immersive-markdown-editor.util';
import { createMarkdownValueState, resolveMarkdownEmission, type MarkdownValueState } from '../../utils/immersive-markdown-value.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(focusout)': 'onFocusOut($event)',
    '[class.immersive-markdown-editor--disabled]': 'isDisabled()',
  },
  imports: [IgntIconComponent, IgntTooltipDirective, TranslateModule],
  providers: [{ multi: true, provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ImmersiveMarkdownEditorComponent) }],
  selector: 'app-immersive-markdown-editor',
  styleUrl: './immersive-markdown-editor.component.scss',
  templateUrl: './immersive-markdown-editor.component.html',
})
export class ImmersiveMarkdownEditorComponent implements ControlValueAccessor {
  readonly labelledBy = input.required<string>();
  readonly placeholder = input<string>('');

  readonly #destroyRef = inject(DestroyRef);
  readonly #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly activeFormats = signal<ReadonlySet<ImmersiveMarkdownFormat>>(new Set());
  protected readonly editorHost = viewChild.required<ElementRef<HTMLElement>>('editorHost');
  protected readonly isDisabled = signal<boolean>(false);
  protected readonly toolbarItems = IMMERSIVE_MARKDOWN_TOOLBAR_ITEMS;

  #editor: Editor | null = null;
  #onChange: ((value: string) => void) | null = null;
  #onTouched: (() => void) | null = null;
  #value: MarkdownValueState = createMarkdownValueState('');

  constructor() {
    afterNextRender(() => {
      this.#mountEditor();
    });
    // The placeholder is read while the decorations are built, so a new text needs one empty transaction to show.
    effect(() => {
      this.placeholder();
      this.#editor?.view.dispatch(this.#editor.state.tr);
    });
    this.#destroyRef.onDestroy(() => {
      this.#editor?.destroy();
    });
  }

  registerOnChange(onChange: (value: string) => void): void {
    this.#onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.#onTouched = onTouched;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
    this.#editor?.setEditable(!isDisabled, false);
  }

  writeValue(value: string | null): void {
    const text = value ?? '';

    if (text === this.#value.current) {
      return;
    }
    this.#value = createMarkdownValueState(text);
    if (this.#editor !== null) {
      loadMarkdownIntoEditor(this.#editor, text);
    }
  }

  // Focus that stays inside the component (toolbar to text and back) is not leaving it.
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;

    if (next instanceof Node && this.#elementRef.nativeElement.contains(next)) {
      return;
    }
    this.#onTouched?.();
    if (this.#editor !== null && this.#value.current !== this.#value.original) {
      canonicaliseEditorContent(this.#editor);
    }
  }

  protected toggle(format: ImmersiveMarkdownFormat): void {
    if (this.#editor !== null) {
      toggleMarkdownFormat(this.#editor, format);
    }
  }

  #mountEditor(): void {
    this.#editor = new Editor({
      content: descriptionMarkdownToDoc(this.#value.current),
      editable: !this.isDisabled(),
      editorProps: { attributes: { 'aria-labelledby': this.labelledBy(), 'aria-multiline': 'true', role: 'textbox' } },
      element: this.editorHost().nativeElement,
      extensions: [...IMMERSIVE_MARKDOWN_EXTENSIONS, Placeholder.configure({ placeholder: () => this.placeholder() })],
      onTransaction: ({ editor }) => {
        this.activeFormats.set(readActiveMarkdownFormats(editor));
      },
      onUpdate: ({ editor }) => {
        const { emit, state } = resolveMarkdownEmission(this.#value, docToDescriptionMarkdown(editor.getJSON()));

        this.#value = state;
        if (emit !== null) {
          this.#onChange?.(emit);
        }
      },
    });
  }
}
