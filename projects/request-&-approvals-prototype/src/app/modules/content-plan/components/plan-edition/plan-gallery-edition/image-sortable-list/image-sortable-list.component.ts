import { Component, DestroyRef, EventEmitter, inject, Input, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of } from 'rxjs';
import { filter, finalize, map, mergeMap, take } from 'rxjs/operators';

import { MediaListItem, MediaType, MediaVariantItem } from '../plan-gallery-edition.component';
import { VideoDataModalComponent, VideoDataModel } from '../video-data-modal/video-data-modal.component';

@Component({
  selector: 'app-image-sortable-list',
  standalone: false,
  templateUrl: './image-sortable-list.component.html',
  styleUrls: ['./image-sortable-list.component.scss'],
})
export class ImageSortableListComponent {
  #destroyRef = inject(DestroyRef);
  #modalService = inject(NgbModal);

  get elements(): Array<MediaListItem> {
    return this.viewElements;
  }

  set elements(value: Array<MediaListItem>) {
    this.viewElements = value;

    this.photosChange.emit(value);
  }

  @Input() set photos(value: Array<MediaListItem>) {
    this.viewElements = value;
    this.coverMediaIndexes = [this.#getCoverMedia('photo'), this.#getCoverMedia('video')];
  }

  coverMediaIndexes: number[] = [];
  @Input() disabled = false;
  @Input() showCoverVariant = false;
  isUploading = false;

  @Output() photosChange = new EventEmitter<Array<MediaListItem>>();
  @Input() uploadFileCallback!: (file: File) => Observable<string>;
  @Input() uploadVariantFileCallback!: (file: File, mediaType: MediaType) => Observable<MediaVariantItem | null>;

  viewElements: Array<MediaListItem> = [];

  removeMediaItem(index: number): void {
    this.elements = [...this.viewElements.slice(0, index), ...this.viewElements.slice(index + 1)];
  }

  requestUploadFile(onlyPhotos: boolean): void {
    this.#createInputAndGetFile(onlyPhotos).subscribe((item: MediaListItem | null) => {
      if (item) {
        const url = item.url ?? '';
        const name = item.name ?? '';
        if (item.media_type === 'photo') {
          this.#insertMediaItem(url, name, item.media_type);
        } else if (item.media_type === 'video') {
          this.#openVideoDataModal(url, name);
        }
      }
    });
  }

  #createInputAndGetFile(onlyPhotos: boolean): Observable<MediaListItem | null> {
    return new Observable<MediaListItem | null>(observer => {
      const input = document.createElement('input');
      const allowedExtensions = onlyPhotos ? '.png,.jpg,.jpeg' : '.png,.jpg,.jpeg,.mp4,.mov';
      input.setAttribute('type', 'file');
      input.setAttribute('accept', allowedExtensions);
      input.click();

      input.onchange = () => {
        const file: File | undefined = input.files?.[0];
        if (!file) {
          observer.next(null);
          observer.complete();
          return null;
        }

        this.isUploading = true;
        const type = file.type.includes('video') ? 'video' : 'photo';
        const name: string = file.name;

        this.uploadFileCallback(file)
          .pipe(
            finalize(() => {
              this.isUploading = false;
            }),
          )
          .subscribe({
            next: url => {
              observer.next({ id: null, media_type: type, url, name });
              observer.complete();
            },
            error: () => {
              observer.next(null);
              observer.complete();
            },
          });
      };
    });
  }

  addSixteenByNine(index: number): void {
    const element = this.viewElements[index];
    if (this.disabled || !element) {
      return;
    }

    this.#pickVariantFile(element.media_type)
      .pipe(
        mergeMap(variant => (variant && element.media_type === 'video' ? this.#requestVariantVideoData(variant) : of(variant))),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((variant: MediaVariantItem | null) => {
        if (variant) {
          this.#setSixteenByNine(index, variant);
        }
      });
  }

  /**
   * A 16:9 video needs a poster of its own: publish rejects a variant without one, and the card
   * preview draws the poster rather than the video. The poster is picked through the variant upload
   * so it gets the same landscape treatment as the asset it covers.
   */
  #requestVariantVideoData(variant: MediaVariantItem): Observable<MediaVariantItem> {
    const modal = this.#modalService.open(VideoDataModalComponent, { backdrop: 'static' });
    modal.componentInstance.uploadFileFunction = (): Observable<MediaListItem> =>
      this.#pickVariantFile('photo').pipe(
        filter((poster): poster is MediaVariantItem => poster !== null),
        map((poster): MediaListItem => ({ ...poster, media_type: 'photo', url: poster.url })),
      );

    return modal.closed.pipe(
      take(1),
      map((result: VideoDataModel) => ({ ...variant, poster: result.posterUrl, playback_rate: result.playbackRate })),
    );
  }

  removeSixteenByNine(index: number): void {
    if (this.disabled) {
      return;
    }
    this.#setSixteenByNine(index, null);
  }

  #setSixteenByNine(index: number, variant: MediaVariantItem | null): void {
    this.elements = this.viewElements.map((element, position) => (position === index ? { ...element, sixteenByNine: variant } : element));
  }

  #pickVariantFile(mediaType: MediaType): Observable<MediaVariantItem | null> {
    return new Observable<MediaVariantItem | null>(observer => {
      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('accept', mediaType === 'video' ? '.mp4,.mov' : '.png,.jpg,.jpeg');
      input.click();

      input.onchange = () => {
        const file: File | undefined = input.files?.[0];
        if (!file) {
          observer.next(null);
          observer.complete();
          return;
        }

        this.isUploading = true;
        this.uploadVariantFileCallback(file, mediaType)
          .pipe(finalize(() => (this.isUploading = false)))
          .subscribe({
            next: variant => {
              observer.next(variant);
              observer.complete();
            },
            error: () => {
              observer.next(null);
              observer.complete();
            },
          });
      };
    });
  }

  #getCoverMedia(type: MediaType): number {
    return this.elements.findIndex(element => element.media_type === type);
  }

  #insertMediaItem(url: string, name: string, mediaType: MediaType, poster?: string, playback_rate?: number) {
    this.elements = [...this.viewElements, { id: null, media_type: mediaType, url, name, poster, playback_rate }];
  }

  #openVideoDataModal(videoUrl: string, fileName: string): void {
    const modal = this.#modalService.open(VideoDataModalComponent, { backdrop: 'static' });
    modal.componentInstance.uploadFileFunction = (): Observable<MediaListItem> =>
      this.#createInputAndGetFile(true).pipe(filter((item): item is MediaListItem => item !== null));
    modal.closed.pipe(take(1)).subscribe((result: VideoDataModel) => {
      this.#insertMediaItem(videoUrl, fileName, 'video', result.posterUrl, result.playbackRate);
    });
  }
}
