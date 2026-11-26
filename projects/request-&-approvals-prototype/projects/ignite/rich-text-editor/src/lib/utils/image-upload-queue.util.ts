import { signal, type Signal } from '@angular/core';

import type { Editor } from '@tiptap/core';
import { finalize, take, type Observable, type Subscription } from 'rxjs';

import { insertUploadedImageAt } from './insert-uploaded-image.util';

export interface IgntRichTextEditorQueuedImageUpload {
  editor: Editor;
  file: File;
}

export class IgntRichTextEditorImageUploadQueue {
  readonly #hasPendingUploads = signal<boolean>(false);
  readonly #queue: IgntRichTextEditorQueuedImageUpload[] = [];

  #currentSubscription: Subscription | null = null;
  #isProcessing = false;
  #nextInsertPosition: number | null = null;

  readonly hasPendingUploads: Signal<boolean> = this.#hasPendingUploads.asReadonly();

  clear(): void {
    this.#queue.length = 0;
    this.#nextInsertPosition = null;
    this.#isProcessing = false;
    this.#hasPendingUploads.set(false);
    this.#currentSubscription?.unsubscribe();
    this.#currentSubscription = null;
  }

  enqueue(editor: Editor, file: File, insertPos: number | undefined, uploadCallback: (file: File) => Observable<string> | null): void {
    if (this.#nextInsertPosition === null) {
      this.#nextInsertPosition = insertPos ?? editor.state.selection.from;
    }

    this.#queue.push({ editor, file });
    this.#hasPendingUploads.set(true);
    this.#processNext(uploadCallback);
  }

  #finalize(uploadCallback: (file: File) => Observable<string> | null): void {
    if (this.#queue.length === 0) {
      this.#hasPendingUploads.set(false);
      this.#nextInsertPosition = null;

      return;
    }

    this.#processNext(uploadCallback);
  }

  #processNext(uploadCallback: (file: File) => Observable<string> | null): void {
    if (this.#isProcessing || this.#queue.length === 0) {
      return;
    }

    const queuedUpload = this.#queue.shift();

    if (!queuedUpload) {
      return;
    }

    const { editor, file } = queuedUpload;
    const upload = uploadCallback(file);

    if (!upload) {
      this.#finalize(uploadCallback);

      return;
    }

    this.#isProcessing = true;
    this.#currentSubscription = upload
      .pipe(
        take(1),
        finalize(() => {
          this.#isProcessing = false;
          this.#currentSubscription = null;
          this.#finalize(uploadCallback);
        }),
      )
      .subscribe({
        error: () => {
          // finalize() advances the queue; user feedback is the parent's imageUpload responsibility
        },
        next: (url: string) => {
          if (!url || this.#nextInsertPosition === null) {
            return;
          }

          this.#nextInsertPosition = insertUploadedImageAt(editor, url, this.#nextInsertPosition);
        },
      });
  }
}
