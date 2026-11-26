import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, linkedSignal, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { take, throwIfEmpty } from 'rxjs';

import { PreviewFile, PreviewKind } from '../../models/file-preview-dialog.model';
import { BrowserPreviewKind } from '../../models/file-thumbnail.model';
import { browserPreviewKind } from '../../utils/browser-preview.util';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|tiff?|heic|heif|svg)$/i;
const NON_PREVIEWABLE_EXT = /\.(zip|rar|7z|tar|gz|exe|dmg|bin|iso|psd|ai|sketch)$/i;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape()' },
  imports: [TranslateModule, IgntIconButtonComponent],
  selector: 'app-file-preview-dialog',
  standalone: true,
  styleUrl: './file-preview-dialog.component.scss',
  templateUrl: './file-preview-dialog.component.html',
})
export class FilePreviewDialogComponent {
  static readonly previewKindByBrowserKind: Readonly<Record<BrowserPreviewKind, PreviewKind>> = {
    audio: 'audio',
    image: 'image',
    pdf: 'embed',
    text: 'embed',
    video: 'video',
  };

  readonly file = input<PreviewFile | null>(null);
  readonly closed = output<void>();

  readonly #sanitizer = inject(DomSanitizer);
  readonly #destroyRef = inject(DestroyRef);
  readonly #refreshedMediaUrl = linkedSignal<PreviewFile | null, string | null>({ source: this.file, computation: () => null });
  readonly #lastRefreshAtSeconds = linkedSignal<PreviewFile | null, number | null>({ source: this.file, computation: () => null });
  readonly #resumeAtSeconds = linkedSignal<PreviewFile | null, number>({ source: this.file, computation: () => 0 });
  readonly #playbackFailed = linkedSignal<PreviewFile | null, boolean>({ source: this.file, computation: () => false });

  protected readonly playbackFailed = this.#playbackFailed.asReadonly();

  readonly kind = computed<PreviewKind>(() => {
    const f = this.file();
    if (!f) {
      return 'other';
    }
    if ((f.signedUrl ?? '') !== '') {
      const browserKind = browserPreviewKind(f.mimeType, f.originalName);
      return browserKind === null ? 'other' : FilePreviewDialogComponent.previewKindByBrowserKind[browserKind];
    }
    const mime = (f.mimeType ?? '').toLowerCase();
    const name = f.originalName ?? '';
    if (mime.startsWith('image/') || IMAGE_EXT.test(name)) {
      return 'image';
    }
    if (NON_PREVIEWABLE_EXT.test(name)) {
      return 'other';
    }
    return 'embed';
  });

  readonly imageUrl = computed<string>(() => {
    const signedUrl = this.file()?.signedUrl ?? '';
    if (signedUrl !== '') {
      return signedUrl;
    }
    const driveFileId = this.file()?.driveFileId ?? '';
    return driveFileId === '' ? '' : `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w1920`;
  });

  protected readonly mediaUrl = computed<string>(() => this.#refreshedMediaUrl() ?? this.file()?.signedUrl ?? '');

  readonly embedUrl = computed<SafeResourceUrl | null>(() => {
    const signedUrl = this.file()?.signedUrl ?? '';
    if (signedUrl !== '') {
      return this.#sanitizer.bypassSecurityTrustResourceUrl(signedUrl);
    }
    const driveFileId = this.file()?.driveFileId ?? '';
    return driveFileId === ''
      ? null
      : this.#sanitizer.bypassSecurityTrustResourceUrl(`https://drive.google.com/file/d/${driveFileId}/preview`);
  });

  close(): void {
    this.closed.emit();
  }

  onEscape(): void {
    if (this.file()) {
      this.closed.emit();
    }
  }

  protected onMediaError(player: HTMLMediaElement): void {
    const failedFile = this.file();
    const refreshSignedUrl = failedFile?.refreshSignedUrl;
    const failedAtSeconds = player.currentTime;
    const lastRefreshAtSeconds = this.#lastRefreshAtSeconds();
    if (refreshSignedUrl === undefined || (lastRefreshAtSeconds !== null && failedAtSeconds <= lastRefreshAtSeconds)) {
      this.#playbackFailed.set(true);
      return;
    }
    this.#lastRefreshAtSeconds.set(failedAtSeconds);
    this.#resumeAtSeconds.set(failedAtSeconds);
    refreshSignedUrl()
      .pipe(take(1), throwIfEmpty(), takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          if (this.file() === failedFile) {
            this.#playbackFailed.set(true);
          }
        },
        next: (url: string) => {
          if (this.file() === failedFile) {
            this.#refreshedMediaUrl.set(url);
          }
        },
      });
  }

  protected onMediaLoaded(player: HTMLMediaElement): void {
    const resumeAtSeconds = this.#resumeAtSeconds();
    if (resumeAtSeconds === 0) {
      return;
    }
    player.currentTime = resumeAtSeconds;
    this.#resumeAtSeconds.set(0);
    player.play().catch((): void => undefined);
  }
}
