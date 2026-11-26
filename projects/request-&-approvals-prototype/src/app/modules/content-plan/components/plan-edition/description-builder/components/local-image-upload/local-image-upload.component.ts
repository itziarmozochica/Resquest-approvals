import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, TranslateModule],
  selector: 'app-db-local-image-upload',
  standalone: true,
  styleUrl: './local-image-upload.component.scss',
  templateUrl: './local-image-upload.component.html',
})
export class LocalImageUploadComponent {
  readonly #destroyRef = inject(DestroyRef);

  readonly previewUrl = input<string>('');
  /**
   * Called when the user drops or selects a file. Implementations are
   * expected to upload the file to durable storage and resolve to the public
   * URL where the image is accessible. The resolved URL is then emitted via
   * `urlChange` so the parent can set it on the block's `src` field.
   */
  readonly uploadCallback = input.required<(file: File) => Observable<string>>();
  /**
   * When `true`, drag-and-drop, the file picker, the replace button and the
   * clear button are all locked down. The current preview (if any) still
   * renders so the user can see the uploaded image.
   */
  readonly disabled = input<boolean>(false);
  /**
   * Which media the picker accepts. `'image'` (default) → images only;
   * `'video'` → videos only (the full-video block holds a video). Drives the
   * `accept` filter, the client-side MIME guard and whether the preview renders
   * an `<img>` or a `<video>`. (The shared upload endpoint accepts both kinds;
   * this guard is the per-component restriction.)
   */
  readonly mediaKind = input<'image' | 'video'>('image');

  /** `accept` attribute for the file picker, derived from `mediaKind`. */
  readonly acceptAttr = computed<string>(() => (this.mediaKind() === 'video' ? 'video/*' : 'image/*'));

  /**
   * i18n key prefix switched by `mediaKind`, so the shared widget's labels read
   * "…image" or "…video". The `videoUpload.*` keys mirror `imageUpload.*`;
   * image consumers (the default) are unaffected.
   */
  readonly #labelPrefix = computed<string>(() =>
    this.mediaKind() === 'video' ? 'planEdition.contentEdition.builder.videoUpload.' : 'planEdition.contentEdition.builder.imageUpload.',
  );
  readonly dropHereKey = computed<string>(() => `${this.#labelPrefix()}dropHere`);
  readonly dropAriaKey = computed<string>(() => `${this.#labelPrefix()}dropAria`);
  readonly clearKey = computed<string>(() => `${this.#labelPrefix()}clear`);
  readonly replaceKey = computed<string>(() => `${this.#labelPrefix()}replace`);
  readonly replaceHintKey = computed<string>(() => `${this.#labelPrefix()}replaceHint`);
  readonly uploadingKey = computed<string>(() => `${this.#labelPrefix()}uploading`);

  readonly urlChange = output<string>();
  readonly cleared = output<void>();

  readonly dragOver = signal(false);
  readonly uploading = signal(false);

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (this.disabled()) {
      input.value = '';
      return;
    }
    const file = input.files?.[0];
    if (file !== undefined) this.#handleFile(file);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    if (this.disabled()) return;
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    if (this.disabled()) return;
    const target = event.currentTarget as HTMLElement;
    if (!target.contains(event.relatedTarget as Node)) {
      this.dragOver.set(false);
    }
  }

  onDrop(event: DragEvent): void {
    if (this.disabled()) return;
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file !== undefined) this.#handleFile(file);
  }

  clearImage(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled()) return;
    this.cleared.emit();
  }

  triggerInput(fileInput: HTMLInputElement, event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled()) return;
    fileInput.click();
  }

  /** Accept only the configured media kind: video in `video` mode, else image. */
  #isAcceptedType(file: File): boolean {
    return this.mediaKind() === 'video' ? file.type.startsWith('video/') : file.type.startsWith('image/');
  }

  #handleFile(file: File): void {
    if (!this.#isAcceptedType(file)) return;
    // Ignore a new file while an upload is in flight: overlapping requests can
    // resolve out of order and emit a stale `urlChange`, leaving the block pointing
    // at the wrong media. The user can retry once the current upload settles.
    if (this.uploading()) return;
    this.uploading.set(true);
    this.uploadCallback()(file)
      .pipe(
        finalize(() => this.uploading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (url: string) => {
          this.urlChange.emit(url);
        },
        error: () => {
          // Swallowed at this level — the parent's HTTP error handling
          // (interceptor + global toaster) reports it to the user. The
          // local component just resets to a non-uploading state.
        },
      });
  }
}
