import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { ImageCollage, MAX_COLLAGE_IMAGES } from './models/image-collage.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-image-collage',
  styleUrl: './image-collage.component.scss',
  templateUrl: './image-collage.component.html',
})
export class ImageCollageComponent {
  readonly images = input<readonly ImageCollage[]>([]);
  readonly fallback = input<ImageCollage | null>(null);

  readonly #failedUrls = signal<ReadonlySet<string>>(new Set<string>());

  protected readonly visibleImages = computed(() => {
    const failedUrls = this.#failedUrls();
    const isLoadable = (image: ImageCollage): boolean => image.url.trim().length > 0 && !failedUrls.has(image.url);
    const images = this.images().filter(isLoadable).slice(0, MAX_COLLAGE_IMAGES);
    const fallback = this.fallback();

    if (images.length > 0 || fallback === null || !isLoadable(fallback)) {
      return images;
    }

    return [fallback];
  });

  protected readonly layoutClass = computed(() => `image-collage--count-${this.visibleImages().length}`);

  protected onImageError(url: string): void {
    this.#failedUrls.update(failedUrls => (failedUrls.has(url) ? failedUrls : new Set([...failedUrls, url])));
  }
}
