import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  OnDestroy,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

import { IgntDialogService, IgntEmojiPickerComponent, IgntUUIDDirective } from '@ignite/common';
import { Editor } from '@tiptap/core';
import { Observable, Subject, take, takeUntil, timer } from 'rxjs';

import { IgntRichTextEditorTranslationsDirective } from '../../directives/rich-text-editor-translations.directive';
import { IgntRichTextEditorFeature } from '../../models/enums/rich-text-editor-feature.enum';
import {
  DEFAULT_IGNT_RICH_TEXT_EDITOR_BLOCK_ELEMENT,
  IgntRichTextEditorBlockElement,
  toIgntRichTextEditorBlockTag,
} from '../../models/rich-text-editor-block-element.model';
import type { IgntRichTextEditorLinkModalData } from '../../models/rich-text-editor-link-modal-data.model';
import type { IgntRichTextEditorLinkModalResult } from '../../models/rich-text-editor-link-modal-result.model';
import { isEditorActionActive } from '../../utils/action-state.util';
import { buildExtensionsFromFeatures, isFeatureEnabled } from '../../utils/build-extensions.util';
import { collectToolbarActions } from '../../utils/collect-toolbar-actions.util';
import { dataUriToBlob, isValidImageDataUri } from '../../utils/file.util';
import { applyTiptapEditorContent, getTiptapExportHtml } from '../../utils/html.util';
import { applyImageAlign, imageAlignForFeature, isImageAlignFeature, toggleImageFullWidth } from '../../utils/image-align.util';
import { IgntRichTextEditorImageUploadQueue } from '../../utils/image-upload-queue.util';
import { openImageFilePicker } from '../../utils/open-image-file-picker.util';
import { resolveFeatures } from '../../utils/resolve-features.util';
import { applySelectionAlign, IgntRichTextEditorSelectionAlign } from '../../utils/selection-align.util';
import { IgntRichTextEditorLinkModalComponent } from '../rich-text-editor-link-modal/rich-text-editor-link-modal.component';
import { IgntRichTextEditorToolbarComponent } from '../rich-text-editor-toolbar/rich-text-editor-toolbar.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-busy]': 'isBusy() || null',
    '[attr.aria-disabled]': 'isDisabled() || null',
    '[attr.aria-readonly]': 'readonly() || null',
  },
  hostDirectives: [IgntRichTextEditorTranslationsDirective, IgntUUIDDirective],
  imports: [FormsModule, IgntEmojiPickerComponent, IgntRichTextEditorToolbarComponent],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: IgntRichTextEditorComponent,
    },
  ],
  selector: 'ignt-rich-text-editor',
  standalone: true,
  styleUrl: './rich-text-editor.component.scss',
  templateUrl: './rich-text-editor.component.html',
})
export class IgntRichTextEditorComponent implements AfterViewInit, ControlValueAccessor, OnDestroy {
  /** Set of toolbar features to enable; use a preset or compose your own. */
  readonly features = input.required<ReadonlySet<IgntRichTextEditorFeature>>();
  /** When true, inline base64 (`data:`) image sources are preserved instead of stripped on load. */
  readonly allowBase64 = input<boolean>(false);
  /** HTML tag used to wrap top-level blocks in the editor output (`'div'` or `'p'`). */
  readonly blockElement = input<IgntRichTextEditorBlockElement>(DEFAULT_IGNT_RICH_TEXT_EDITOR_BLOCK_ELEMENT);
  /** Maximum number of characters allowed; `null` disables the limit. */
  readonly characterLimit = input<number | null>(null);
  /** Callback that uploads an image file and returns an observable resolving to its public URL. */
  readonly imageUpload = input<((file: File) => Observable<string> | null) | null>(null);
  /** Placeholder text shown when the editor is empty. */
  readonly placeholder = input<string>('');
  /**
   * Reads loaded whitespace as content rather than formatting. On for hand-written content; off for
   * markup that may be pretty-printed, which would otherwise gain a line break per source line.
   */
  readonly preserveWhitespace = input<boolean>(false);
  /** When true, the editor is non-editable and toolbar actions are disabled. */
  readonly readonly = input<boolean>(false);

  /** Emitted when the editor loses focus. */
  readonly blurred = output();
  /** Emitted with the current character count whenever the content changes. */
  readonly characterCountChange = output<number>();

  readonly #cdr = inject(ChangeDetectorRef);
  readonly #destroy$ = new Subject<void>();
  readonly #dialogService = inject(IgntDialogService);
  readonly #document = inject(DOCUMENT);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #injector = inject(Injector);
  readonly #translationsDirective = inject(IgntRichTextEditorTranslationsDirective);
  readonly #uuidDirective = inject(IgntUUIDDirective);
  protected readonly editorHost = viewChild<ElementRef<HTMLElement>>('editorHost');
  protected readonly emojiPanel = viewChild<ElementRef<HTMLElement>>('emojiPanel');
  protected readonly emojiPanelId = `ignt-rich-text-editor-emoji-panel-${this.#uuidDirective.uuid}`;

  #editor: Editor | null = null;
  #hasDeferredBlur = false;
  readonly #imageUploadQueue = new IgntRichTextEditorImageUploadQueue();
  #mountGeneration = 0;
  #onChange: ((value: string) => void) | null = null;
  #onTouched: (() => void) | null = null;
  #pendingContent = '';

  /**
   * `contenteditable` alone collapses readonly, form-disabled and mid-upload into a single
   * state. These are published separately on the host so consumers can tell them apart.
   */
  protected readonly isBusy = this.#imageUploadQueue.hasPendingUploads;
  protected readonly isDisabled = signal<boolean>(false);
  protected readonly isInteractionLocked = computed<boolean>(() => this.readonly() || this.isDisabled() || this.isBusy());
  protected readonly showEmojiPanel = signal<boolean>(false);
  protected readonly showSourceView = signal<boolean>(false);
  protected readonly sourceContent = signal<string>('');

  constructor() {
    effect(() => {
      const isLocked: boolean = this.isInteractionLocked();
      this.#editor?.setEditable(!isLocked, false);

      if (isLocked) {
        // Unmounting the panel strips a focused picker out of the DOM without firing `focusout`,
        // so a blur deferred while the panel was open is flushed here.
        this.showEmojiPanel.set(false);
        this.#scheduleDeferredBlurCheck();
      }
    });

    // Cancel in-flight/queued uploads when the control becomes non-editable.
    // Must not use isInteractionLocked — that includes isBusy and would cancel on enqueue.
    effect(() => {
      if (this.readonly() || this.isDisabled()) {
        this.#imageUploadQueue.clear();
      }
    });

    effect(() => {
      this.characterLimit();
      this.#syncCharacterLimit();
    });

    effect(() => {
      this.placeholder();
      this.#editor?.view.dispatch(this.#editor.state.tr);
    });
  }

  ngAfterViewInit(): void {
    this.#initEditor();
  }

  ngOnDestroy(): void {
    this.#mountGeneration += 1;
    this.#imageUploadQueue.clear();
    this.#destroy$.next();
    this.#destroy$.complete();
    this.#editor?.destroy();
    this.#editor = null;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  writeValue(value: string | null): void {
    const html = value ?? '';
    this.sourceContent.set(html);

    if (!this.#editor) {
      this.#pendingContent = html;

      return;
    }

    if (this.showSourceView()) {
      return;
    }

    this.#loadHtmlIntoEditor(html);
    this.#emitCharacterCount();
    this.#cdr.markForCheck();
  }

  protected closeEmojiPanel(): void {
    if (!this.showEmojiPanel()) {
      return;
    }

    this.showEmojiPanel.set(false);
    this.#editor?.chain().focus().run();
  }

  protected executeToolbarAction(action: IgntRichTextEditorFeature): void {
    if (action === IgntRichTextEditorFeature.SourceHtml) {
      this.toggleSourceView();

      return;
    }

    if (!this.#editor || this.showSourceView() || this.isInteractionLocked()) {
      return;
    }

    const imageAlign = imageAlignForFeature(action);

    if (imageAlign !== undefined) {
      applyImageAlign(this.#editor, imageAlign);

      return;
    }

    switch (action) {
      case IgntRichTextEditorFeature.AlignCenter:
        this.#applySelectionAlign('center');
        break;
      case IgntRichTextEditorFeature.AlignLeft:
        this.#applySelectionAlign('left');
        break;
      case IgntRichTextEditorFeature.AlignRight:
        this.#applySelectionAlign('right');
        break;
      case IgntRichTextEditorFeature.Bold:
        this.#editor.chain().focus().toggleBold().run();
        break;
      case IgntRichTextEditorFeature.BulletList:
        this.#editor.chain().focus().toggleBulletList().run();
        break;
      case IgntRichTextEditorFeature.Clean:
        this.#editor.chain().focus().unsetAllMarks().clearNodes().run();
        break;
      case IgntRichTextEditorFeature.Emoji:
        this.#toggleEmojiPanel();
        break;
      case IgntRichTextEditorFeature.Image:
        this.#openImagePicker();
        break;
      case IgntRichTextEditorFeature.ImageFullWidth:
        toggleImageFullWidth(this.#editor);
        break;
      case IgntRichTextEditorFeature.Italic:
        this.#editor.chain().focus().toggleItalic().run();
        break;
      case IgntRichTextEditorFeature.Link:
        this.#setLink();
        break;
      case IgntRichTextEditorFeature.OrderedList:
        this.#editor.chain().focus().toggleOrderedList().run();
        break;
      case IgntRichTextEditorFeature.Strike:
        this.#editor.chain().focus().toggleStrike().run();
        break;
      case IgntRichTextEditorFeature.Underline:
        this.#editor.chain().focus().toggleUnderline().run();
        break;
      default:
        break;
    }
  }

  protected insertEmoji(emoji: string): void {
    if (!this.#editor || this.isInteractionLocked()) {
      return;
    }

    this.#editor.chain().focus().insertContent({ text: emoji, type: 'text' }).run();
    this.showEmojiPanel.set(false);
  }

  protected isActionActive(action: IgntRichTextEditorFeature): boolean {
    if (action === IgntRichTextEditorFeature.Emoji) {
      return this.showEmojiPanel();
    }

    if (action === IgntRichTextEditorFeature.SourceHtml) {
      return this.showSourceView();
    }

    if (!this.#editor) {
      return false;
    }

    return isEditorActionActive(this.#editor, action);
  }

  protected isActionAvailable(action: IgntRichTextEditorFeature): boolean {
    if (!this.#editor) {
      return false;
    }

    if (action === IgntRichTextEditorFeature.ImageFullWidth || isImageAlignFeature(action)) {
      return this.#editor.isActive('image');
    }

    return true;
  }

  protected onEmojiPanelFocusOut(): void {
    this.#scheduleDeferredBlurCheck();
  }

  protected onSourceHtmlChange(event: Event): void {
    if (this.isInteractionLocked()) {
      return;
    }

    const target = event.target as HTMLTextAreaElement;
    this.sourceContent.set(target.value);
    this.#onChange?.(target.value);
  }

  protected readonly toolbarFeatures = computed((): ReadonlySet<IgntRichTextEditorFeature> => {
    if (this.showSourceView()) {
      return new Set([IgntRichTextEditorFeature.SourceHtml]);
    }

    return resolveFeatures(this.features(), { imageUpload: this.imageUpload() ?? null });
  });

  protected toggleSourceView(): void {
    if (!this.#editor) {
      return;
    }

    if (this.isInteractionLocked() && !this.showSourceView()) {
      return;
    }

    if (!this.showSourceView()) {
      this.#mountGeneration += 1;
      const exportedHtml = getTiptapExportHtml(this.#editor);
      this.sourceContent.set(exportedHtml);
      this.#editor.unmount();
      this.showSourceView.set(true);

      return;
    }

    const content = this.sourceContent();
    this.showSourceView.set(false);
    this.#scheduleEditorRemount(content);
  }

  protected get toolbarActiveActions(): ReadonlySet<IgntRichTextEditorFeature> {
    return collectToolbarActions(this.toolbarFeatures(), (feature: IgntRichTextEditorFeature) => this.isActionActive(feature));
  }

  protected get toolbarUnavailableActions(): ReadonlySet<IgntRichTextEditorFeature> {
    const inSourceView = this.showSourceView();

    return collectToolbarActions(this.toolbarFeatures(), (feature: IgntRichTextEditorFeature) => {
      const isSourceExitWhileInSourceView = inSourceView && feature === IgntRichTextEditorFeature.SourceHtml;

      return !isSourceExitWhileInSourceView && (this.isInteractionLocked() || !this.isActionAvailable(feature));
    });
  }

  #applySelectionAlign(targetAlign: IgntRichTextEditorSelectionAlign): void {
    if (!this.#editor) {
      return;
    }

    applySelectionAlign(this.#editor, targetAlign);
  }

  #emitCharacterCount(): void {
    if (!this.#editor) {
      return;
    }

    this.characterCountChange.emit(this.#editor.storage.characterCount.characters());
  }

  #enqueueImageUpload(editor: Editor, file: File, insertPos?: number): void {
    if (this.readonly() || this.isDisabled() || !file.type.startsWith('image/')) {
      return;
    }

    const uploadCallback = this.imageUpload();

    if (!uploadCallback) {
      return;
    }

    this.#imageUploadQueue.enqueue(editor, file, insertPos, uploadCallback);
  }

  #handleDataUriUpload(editor: Editor, dataUri: string): void {
    if (this.readonly() || this.isDisabled() || !isValidImageDataUri(dataUri)) {
      return;
    }

    const imageBlob = dataUriToBlob(dataUri);

    if (imageBlob === null) {
      return;
    }

    const file = new File([imageBlob], 'pasted.png', { type: imageBlob.type });
    this.#enqueueImageUpload(editor, file);
  }

  #handleImageUpload(editor: Editor, file: File, insertPos?: number): void {
    this.#enqueueImageUpload(editor, file, insertPos);
  }

  #initEditor(): void {
    const uploadCallback = this.imageUpload();
    const resolved = resolveFeatures(this.features(), { imageUpload: uploadCallback ?? null });
    const initialContent = this.#pendingContent;

    this.#pendingContent = '';

    this.#editor = new Editor({
      autofocus: false,
      content: '',
      editable: !this.isInteractionLocked(),
      extensions: buildExtensionsFromFeatures(resolved, {
        allowBase64: this.allowBase64(),
        blockTag: toIgntRichTextEditorBlockTag(this.blockElement()),
        characterLimit: this.characterLimit(),
        fileUploadEnabled: Boolean(uploadCallback),
        imageResizeEnabled: isFeatureEnabled(resolved, IgntRichTextEditorFeature.ImageFullWidth),
        placeholder: () => untracked(this.placeholder),
        onImageUpload: (editor: Editor, file: File, insertPos?: number) => {
          this.#handleImageUpload(editor, file, insertPos);
        },
        onPasteDataUri: (editor: Editor, dataUri: string) => {
          this.#handleDataUriUpload(editor, dataUri);
        },
      }),
      onBlur: ({ event }) => {
        this.#hasDeferredBlur = this.#isFocusMovingIntoEmojiPanel(event);

        if (!this.#hasDeferredBlur) {
          this.#reportBlur();
        }
      },
      onFocus: () => {
        this.#hasDeferredBlur = false;
      },
      onSelectionUpdate: () => {
        this.#cdr.markForCheck();
      },
      onUpdate: ({ editor }) => {
        this.#onChange?.(getTiptapExportHtml(editor));
        this.#emitCharacterCount();
        this.#cdr.markForCheck();
      },
    });

    const host = this.editorHost();

    if (host) {
      this.#editor.mount(host.nativeElement);
    }

    if (initialContent) {
      this.#loadHtmlIntoEditor(initialContent);
    }

    this.#emitCharacterCount();
    this.#cdr.markForCheck();
  }

  #insertImageFromFile(file: File): void {
    if (!this.#editor) {
      return;
    }

    this.#handleImageUpload(this.#editor, file);
  }

  #isFocusMovingIntoEmojiPanel(event: FocusEvent): boolean {
    const panel: HTMLElement | undefined = this.emojiPanel()?.nativeElement;

    if (panel === undefined) {
      return false;
    }

    if (!(event.relatedTarget instanceof Node)) {
      // Safari reports a null relatedTarget when focus lands inside a shadow root.
      return panel.contains(this.#document.activeElement);
    }

    return panel.contains(event.relatedTarget);
  }

  #loadHtmlIntoEditor(html: string): void {
    if (!this.#editor) {
      return;
    }

    applyTiptapEditorContent(this.#editor, html, { preserveWhitespace: this.preserveWhitespace() });
  }

  #openImagePicker(): void {
    if (this.isInteractionLocked()) {
      return;
    }

    openImageFilePicker((file: File) => {
      this.#insertImageFromFile(file);
    });
  }

  #reportBlur(): void {
    this.#hasDeferredBlur = false;
    // A reported blur means focus left the editor for good, so the overlay is dismissed with it.
    this.showEmojiPanel.set(false);
    this.#onTouched?.();
    this.blurred.emit();
    this.#cdr.markForCheck();
  }

  #scheduleDeferredBlurCheck(): void {
    // `focusout` fires before the browser moves focus, so the element receiving it can only be
    // resolved once the current task has finished. Tied to #destroy$ so a pending check cannot
    // report a blur on a destroyed view.
    timer(0)
      .pipe(takeUntil(this.#destroy$))
      .subscribe(() => {
        const activeElement = this.#document.activeElement;

        if (!this.#hasDeferredBlur || (activeElement !== null && this.#host.nativeElement.contains(activeElement))) {
          return;
        }

        this.#reportBlur();
      });
  }

  #scheduleEditorRemount(content: string): void {
    this.#mountGeneration += 1;
    const generation = this.#mountGeneration;

    afterNextRender(
      () => {
        if (generation !== this.#mountGeneration) {
          return;
        }

        if (this.showSourceView() || !this.#editor) {
          return;
        }

        const host = this.editorHost();

        if (!host) {
          return;
        }

        this.#loadHtmlIntoEditor(content);
        this.#editor.mount(host.nativeElement);
        this.#emitCharacterCount();
        this.#cdr.markForCheck();
      },
      { injector: this.#injector },
    );
  }

  #setLink(): void {
    if (!this.#editor) {
      return;
    }

    const previousUrl = (this.#editor.getAttributes('link').href as string | undefined) ?? '';
    const translations = this.#translationsDirective.translations();
    const data: IgntRichTextEditorLinkModalData = { previousUrl, translations: translations.linkPopover };

    const ref = this.#dialogService.openModal<IgntRichTextEditorLinkModalResult, IgntRichTextEditorLinkModalData>(
      IgntRichTextEditorLinkModalComponent,
      { data, size: 'sm' },
    );

    ref.closed$.pipe(take(1), takeUntil(this.#destroy$)).subscribe((result?: IgntRichTextEditorLinkModalResult) => {
      if (!this.#editor || !result || result.action === 'cancel') {
        return;
      }

      if (result.action === 'remove') {
        this.#editor.chain().focus().extendMarkRange('link').unsetLink().run();

        return;
      }

      this.#editor.chain().focus().extendMarkRange('link').setLink({ href: result.url }).run();
    });
  }

  #syncCharacterLimit(): void {
    if (!this.#editor) {
      return;
    }

    const limit = this.characterLimit();
    const characterCountExtension = this.#editor.extensionManager.extensions.find(extension => extension.name === 'characterCount');

    if (!characterCountExtension) {
      return;
    }

    const options = characterCountExtension.options as { limit?: number | null | undefined };
    options.limit = limit ?? undefined;
  }

  #toggleEmojiPanel(): void {
    if (this.showEmojiPanel()) {
      this.closeEmojiPanel();

      return;
    }

    this.showEmojiPanel.set(true);
  }
}
