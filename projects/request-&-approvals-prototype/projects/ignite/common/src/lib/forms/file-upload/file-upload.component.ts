import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';

import { IgntButtonComponent } from '../../actions/button/button.component';
import { IgntPillButtonComponent } from '../../selection/pill-button/pill-button.component';
import { fileUploadPillLabel } from './file-upload.util';
import type { IgntFileUploadFile } from './models/file-upload.model';

/**
 * File picker with a drag-and-drop zone and a "browse" action, wrapping the native
 * `<input type="file">` so consumers never render a raw input.
 *
 * ### When to use
 * - Letting a user upload a file by dragging it onto a zone or picking it from their device
 * - Any form step that accepts a document, image, or data file
 * - Showing the files the consumer already holds, each as a pill that can be removed
 * - Accepting several files in one gesture, with `multiple`
 *
 * ### When NOT to use
 * - Selecting from files that already live on the server → use a picker or list instead
 *
 * ### Related
 * - [Button](?path=/docs/components-actions-button--docs) — the browse action is an `IgntButton`
 * - [Pill button](?path=/docs/components-selection-pill-button--docs) — each attached file is a pill button with its close action
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, IgntButtonComponent, IgntPillButtonComponent],
  selector: 'ignt-file-upload',
  standalone: true,
  styleUrl: './file-upload.component.scss',
  templateUrl: './file-upload.component.html',
})
export class IgntFileUploadComponent {
  /**
   * Accepted file types (e.g. `['.csv']`, `['image/png', 'image/jpeg']`), enforced on the chosen
   * file (drop or dialog) and joined into the native input's `accept` attribute. Empty allows any file.
   *
   * The native attribute only filters the file dialog; a file dropped on the zone bypasses it, so a
   * non-matching file is reported through `filesRejected` instead of being dropped silently.
   */
  readonly accept = input<string[]>([]);

  /**
   * Label for the built-in "browse" button that opens the file dialog.
   */
  readonly actionLabel = input<string>('');

  /**
   * Prevents interaction: dimmed appearance, drag-and-drop off, browse button disabled.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Files the consumer wants shown as removable pills under the drop zone.
   * Each pill shows the name and, when `sizeInBytes` is set, a compact size.
   * The component does not append or remove files: a pick arrives through `filesSelected`,
   * and the ✕ emits `fileRemoved`.
   */
  readonly files = input<readonly IgntFileUploadFile[]>([]);

  /**
   * Secondary helper text shown below the action (e.g. accepted formats or size limit).
   */
  readonly hint = input<string>('');

  /**
   * Primary instructional text shown in the drop zone (e.g. "Drag your file here").
   */
  readonly label = input<string>('');

  /**
   * Allows more than one file in a single pick or drop, matching the native `multiple` attribute.
   * Off by default, so a consumer that wants one file passes nothing.
   */
  readonly multiple = input(false, { transform: booleanAttribute });

  /**
   * Emitted with the file whose pill the user removed, so the consumer can drop it from `files`.
   * Not emitted while `disabled`.
   */
  readonly fileRemoved = output<IgntFileUploadFile>();

  /**
   * Emitted at most once per pick or drop with the files that do not match `accept`, so consumers
   * can explain why they were not attached. With `multiple` off only the first file of the gesture is
   * checked, and any others are ignored, not rejected. Never emitted with an empty array.
   * Never emitted while `disabled`, nor when `accept` is empty (every file matches).
   */
  readonly filesRejected = output<readonly File[]>();

  /**
   * Emitted at most once per pick or drop with the files that match `accept`. Never emitted with an empty array.
   * With `multiple` off it holds the first file of the gesture and any others are ignored. With `multiple` on,
   * a gesture mixing valid and invalid files emits both this and `filesRejected`.
   */
  readonly filesSelected = output<readonly File[]>();

  #dragDepth = 0;
  protected readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  protected readonly filePills = computed(() =>
    this.files().map((file: IgntFileUploadFile) => ({
      file,
      label: fileUploadPillLabel(file),
    })),
  );
  protected readonly isDragOver = signal(false);

  protected onBrowseClick(): void {
    this.fileInput().nativeElement.click();
  }

  protected onDragEnter(event: DragEvent): void {
    event.preventDefault();
    this.#dragDepth += 1;

    if (!this.disabled()) {
      this.isDragOver.set(true);
    }
  }

  protected onDragLeave(): void {
    this.#dragDepth -= 1;

    if (this.#dragDepth <= 0) {
      this.#dragDepth = 0;
      this.isDragOver.set(false);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();

    if (!this.disabled()) {
      this.isDragOver.set(true);
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.#dragDepth = 0;
    this.isDragOver.set(false);

    const files = Array.from(event.dataTransfer?.files ?? []);

    if (this.disabled() || files.length === 0) {
      return;
    }

    this.#emitSelection(files);
  }

  protected onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files ?? []);
    target.value = '';

    if (files.length === 0) {
      return;
    }

    this.#emitSelection(files);
  }

  protected onFileRemoved(file: IgntFileUploadFile): void {
    if (this.disabled()) {
      return;
    }

    this.fileRemoved.emit(file);
  }

  #emitSelection(files: readonly File[]): void {
    const considered = this.multiple() ? files : files.slice(0, 1);
    const accepted = considered.filter(file => this.#matchesAccept(file));
    const rejected = considered.filter(file => !this.#matchesAccept(file));

    if (rejected.length > 0) {
      this.filesRejected.emit(rejected);
    }

    if (accepted.length > 0) {
      this.filesSelected.emit(accepted);
    }
  }

  #matchesAccept(file: File): boolean {
    const tokens = this.accept()
      .map(token => token.trim().toLowerCase())
      .filter(token => token.length > 0);

    if (tokens.length === 0) {
      return true;
    }

    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();

    return tokens.some(token => {
      if (token.startsWith('.')) {
        return fileName.endsWith(token);
      }

      if (token.endsWith('/*')) {
        return fileType.startsWith(token.slice(0, -1));
      }

      return fileType === token;
    });
  }
}
