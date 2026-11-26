import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';

import { IgntDialogService } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';
import { EMPTY, Observable } from 'rxjs';
import { filter, finalize, take } from 'rxjs/operators';

import { IconsModule } from '../../icons/icons.module';
import { MediaListItem, MediaType } from '../../models/media/media.model';
import { VideoDataModel } from '../../models/media/video.model';
import { DraggableListSortingComponent } from '../draggable-list-sorting/draggable-list-sorting.component';
import { VideoDataModalComponent, type VideoDataModalData } from '../video-data-modal/video-data-modal.component';

@Component({
  selector: 'app-image-sortable-list',
  templateUrl: './image-sortable-list.component.html',
  styleUrls: ['./image-sortable-list.component.scss'],
  imports: [DraggableListSortingComponent, IconsModule, NgIf, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ImageSortableListComponent {
  readonly #dialogService = inject(IgntDialogService);

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
  isUploading = signal(false);

  @Output() photosChange = new EventEmitter<Array<MediaListItem>>();
  @Input() hasError = false;
  @Input() uploadFileCallback: (file: File) => Observable<string> = () => EMPTY;
  @Input() uploadFileTextKey = 'planEdition.galleryEdition.uploadFileText';

  viewElements: Array<MediaListItem> = [];

  removeMediaItem(index: number): void {
    this.elements = [...this.viewElements.slice(0, index), ...this.viewElements.slice(index + 1)];
  }
  requestUploadFile(onlyPhotos: boolean): void {
    this.#createInputAndGetFile(onlyPhotos)
      .pipe(take(1))
      .subscribe((item: MediaListItem | null) => {
        if (item === null) {
          return;
        }

        if (item.media_type === 'photo') {
          this.#insertMediaItem(item.url, item.name ?? '', item.media_type);
        } else if (item.media_type === 'video') {
          this.#openVideoDataModal(item.url, item.name ?? '');
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

        this.isUploading.set(true);
        const type = file.type.includes('video') ? 'video' : 'photo';
        const name: string = file.name;

        this.uploadFileCallback(file)
          .pipe(
            finalize(() => {
              this.isUploading.set(false);
            }),
          )
          .subscribe({
            next: url => {
              observer.next({ media_type: type, name, url });
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

  #insertMediaItem(url: string, name: string, mediaType: MediaType, poster?: string, playbackRate?: number): void {
    this.elements = [
      ...this.viewElements,
      {
        media_type: mediaType,
        name,
        url,
        ...(poster !== undefined ? { poster } : {}),
        ...(playbackRate !== undefined ? { playback_rate: playbackRate } : {}),
      },
    ];
  }

  #openVideoDataModal(videoUrl: string, fileName: string): void {
    const dialogRef = this.#dialogService.openModal<VideoDataModel, VideoDataModalData>(VideoDataModalComponent, {
      data: {
        uploadFileFunction: (): Observable<MediaListItem> =>
          this.#createInputAndGetFile(true).pipe(filter((item): item is MediaListItem => item !== null)),
      },
      disableCloseShortcuts: true,
      size: 'md',
    });

    dialogRef.closed$.pipe(take(1)).subscribe((result: VideoDataModel | undefined) => {
      if (!result) {
        return;
      }

      this.#insertMediaItem(videoUrl, fileName, 'video', result.posterUrl, result.playbackRate);
    });
  }
}
