import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { IgntIconComponent } from '@ignite/icon';

import { PARTNERS_HUB_S3_THUMBNAILS_FLAG } from '../../../ir-approval.optimizely-features';
import {
  driveThumbnailUrl,
  FILE_THUMBNAIL_HEIGHT_PX,
  FILE_THUMBNAIL_WIDTH_PX,
  fileThumbnailIcon,
  FileThumbnailKind,
  fileThumbnailKind,
  isDriveThumbnailable,
  ThumbnailSource,
} from '../../models/file-thumbnail.model';
import { RemoteThumbnailUrlStore } from '../../services/remote-thumbnail-url-store.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent],
  selector: 'app-file-thumbnail',
  standalone: true,
  styleUrl: './file-thumbnail.component.scss',
  templateUrl: './file-thumbnail.component.html',
})
export class FileThumbnailComponent {
  readonly driveFileId = input<string | undefined>(undefined);
  readonly fileName = input<string>('');
  readonly kindOverride = input<FileThumbnailKind | undefined>(undefined);
  readonly mimeType = input<string | undefined>(undefined);
  readonly previewImageUrl = input<string | undefined>(undefined);
  readonly remoteThumbnailUrl = input<string | null | undefined>(undefined);
  readonly testId = input<string | undefined>(undefined);

  protected readonly kind = computed(() => this.kindOverride() ?? fileThumbnailKind(this.mimeType(), this.fileName()));
  protected readonly icon = computed(() => fileThumbnailIcon(this.kind()));
  protected readonly width = FILE_THUMBNAIL_WIDTH_PX;
  protected readonly height = FILE_THUMBNAIL_HEIGHT_PX;

  readonly #remoteThumbnails = inject(RemoteThumbnailUrlStore);
  readonly #optimizely = inject(OptimizelyService);
  readonly #isRemoteThumbnailEnabled = this.#optimizely.isFeatureEnabled(PARTNERS_HUB_S3_THUMBNAILS_FLAG) === true;
  readonly #remoteThumbnailUrl = computed(() => (this.#isRemoteThumbnailEnabled ? (this.remoteThumbnailUrl() ?? '') : ''));
  readonly #failedUrls = signal<ReadonlySet<string>>(new Set());

  readonly #candidates = computed<readonly ThumbnailSource[]>(() => {
    const previewImageUrl = this.previewImageUrl() ?? '';
    const remoteThumbnailUrl = this.#remoteThumbnailUrl();
    const driveFileId = this.driveFileId() ?? '';
    const resolvedRemoteUrl = remoteThumbnailUrl === '' ? null : this.#remoteThumbnails.lookup(remoteThumbnailUrl);
    const driveUrl =
      driveFileId !== '' && isDriveThumbnailable(this.kind()) ? driveThumbnailUrl(driveFileId, FILE_THUMBNAIL_WIDTH_PX * 2) : null;
    return [
      ...(previewImageUrl === '' ? [] : [{ isRemote: false, url: previewImageUrl }]),
      ...(resolvedRemoteUrl === null ? [] : [{ isRemote: true, url: resolvedRemoteUrl }]),
      ...(driveUrl === null ? [] : [{ isRemote: false, url: driveUrl }]),
    ];
  });

  readonly #source = computed<ThumbnailSource | null>(() => {
    const failedUrls = this.#failedUrls();
    return this.#candidates().find(candidate => !failedUrls.has(candidate.url)) ?? null;
  });

  protected readonly imageUrl = computed<string | null>(() => this.#source()?.url ?? null);

  protected onImageError(url: string): void {
    if (this.#isRemote(url)) {
      this.#remoteThumbnails.markFailed(url);
    }
    this.#failedUrls.update(failedUrls => new Set(failedUrls).add(url));
  }

  protected onImageLoad(url: string): void {
    if (this.#isRemote(url)) {
      this.#remoteThumbnails.markLoaded(url);
    }
  }

  #isRemote(url: string): boolean {
    return this.#candidates().some(candidate => candidate.isRemote && candidate.url === url);
  }
}
