import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import {
  IGNT_DIALOG_DATA,
  IgntButtonComponent,
  IgntDialogCloseDirective,
  IgntDialogContentComponent,
  IgntDialogFooterComponent,
  IgntDialogHeaderComponent,
} from '@ignite/common';
import { IgntSkeletonComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton/ignt-skeleton.component';
import { TranslateModule } from '@ngx-translate/core';

import type { ImmersiveMediaPreviewDialogData } from './immersive-media-preview-dialog.model';

type MediaPreviewLoadState = 'broken' | 'loaded' | 'loading';

interface MediaDimensions {
  height: number;
  width: number;
}

/**
 * Full-size preview of one media field, opened from its row. Never trusts a store probe result —
 * a committed url can arrive here `stored` — so it resolves load, broken and dimensions purely
 * from the `<img>`/`<video>` element itself, the same way `immersive-module-preview` does. It IS
 * the probe: `data.onResolved` reports its final outcome back to the store instead of the row
 * opener minting a second, separate request for the same url.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntButtonComponent,
    IgntDialogCloseDirective,
    IgntDialogContentComponent,
    IgntDialogFooterComponent,
    IgntDialogHeaderComponent,
    IgntSkeletonComponent,
    TranslateModule,
  ],
  selector: 'app-immersive-media-preview-dialog',
  standalone: true,
  styleUrl: './immersive-media-preview-dialog.component.scss',
  templateUrl: './immersive-media-preview-dialog.component.html',
})
export class ImmersiveMediaPreviewDialogComponent {
  protected readonly data = inject<ImmersiveMediaPreviewDialogData>(IGNT_DIALOG_DATA);

  // Roughly the height the module preview reserves too, before either element has settled on a
  // real one — only the placeholder's box, never the loaded media's own aspect ratio.
  protected readonly previewHeight = 240;

  // `'any'` tries an image first — the probe service's own strategy — and falls back to a video
  // only once the image element itself proves it cannot render the url.
  protected readonly renderKind = signal<'image' | 'video'>(this.data.kind === 'video' ? 'video' : 'image');
  protected readonly loadState = signal<MediaPreviewLoadState>('loading');
  protected readonly dimensions = signal<MediaDimensions | null>(null);

  protected onImageError(): void {
    if (this.data.kind === 'any' && this.renderKind() === 'image') {
      this.renderKind.set('video');
      return;
    }
    // Final: either the kind was always 'image', or the 'any' video fallback already ran and this
    // is a second error on the same element — either way there is nothing left to try.
    this.loadState.set('broken');
    this.data.onResolved({ status: 'broken' });
  }

  protected onImageLoad(event: Event): void {
    const image = event.target as HTMLImageElement; // `load` only fires on the <img> this template renders
    const dimensions = { height: image.naturalHeight, width: image.naturalWidth };
    this.dimensions.set(dimensions);
    this.loadState.set('loaded');
    this.data.onResolved({ height: dimensions.height, kind: 'image', status: 'ok', width: dimensions.width });
  }

  protected onVideoError(): void {
    // Final: the video element is always the last thing this dialog tries, whether `kind` was
    // 'video' outright or the 'any' fallback landed here after the image half already failed.
    this.loadState.set('broken');
    this.data.onResolved({ status: 'broken' });
  }

  protected onVideoLoadedMetadata(event: Event): void {
    const video = event.target as HTMLVideoElement; // `loadedmetadata` only fires on the <video> this template renders
    const dimensions = { height: video.videoHeight, width: video.videoWidth };
    this.dimensions.set(dimensions);
    this.loadState.set('loaded');
    this.data.onResolved({ height: dimensions.height, kind: 'video', status: 'ok', width: dimensions.width });
  }
}
