import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { IconsModule } from '../../icons/icons.module';
import { MediaListItem } from '../../models/media/media.model';
import { VideoDataModel } from '../../models/media/video.model';

export interface VideoDataModalData {
  uploadFileFunction: () => Observable<MediaListItem>;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconsModule, IgntButtonComponent, IgntDialogModule, NgIf, ReactiveFormsModule, TranslateModule],
  selector: 'app-video-data-modal',
  standalone: true,
  styleUrls: ['./video-data-modal.component.scss'],
  templateUrl: './video-data-modal.component.html',
})
export class VideoDataModalComponent {
  readonly #dialogData = inject<VideoDataModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<VideoDataModel>>(IGNT_DIALOG_REF);

  readonly videoSettingsForm = new FormGroup({
    posterUrl: new FormControl<string | null>(null, [Validators.required]),
    playbackRate: new FormControl(1, [Validators.required, Validators.min(0), Validators.max(1)]),
  });

  requestUploadFile(): void {
    this.#dialogData.uploadFileFunction().subscribe((item: MediaListItem) => {
      this.videoSettingsForm.patchValue({ posterUrl: item?.url });
    });
  }

  close(): void {
    if (!this.videoSettingsForm.valid) {
      return;
    }
    this.#dialogRef.close(this.videoSettingsForm.value as VideoDataModel);
  }
}
