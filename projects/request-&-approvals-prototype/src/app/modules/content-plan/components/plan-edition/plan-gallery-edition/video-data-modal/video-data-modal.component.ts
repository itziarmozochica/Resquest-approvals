import { Component, Input } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NEVER, Observable } from 'rxjs';

import { MediaListItem } from '../plan-gallery-edition.component';

export interface VideoDataModel {
  posterUrl: string;
  playbackRate: number;
}

@Component({
  selector: 'app-video-data-modal',
  standalone: false,
  templateUrl: './video-data-modal.component.html',
  styleUrls: ['./video-data-modal.component.scss'],
})
export class VideoDataModalComponent {
  videoSettingsForm: FormGroup;

  @Input() uploadFileFunction: () => Observable<MediaListItem> = () => NEVER;

  constructor(private modal: NgbActiveModal) {
    this.videoSettingsForm = new FormGroup({
      posterUrl: new FormControl(null, [Validators.required]),
      playbackRate: new FormControl(1, [Validators.required, Validators.min(0), Validators.max(1)]),
    });
  }

  requestUploadFile(): void {
    this.uploadFileFunction().subscribe((item: MediaListItem) => {
      this.videoSettingsForm.patchValue({ posterUrl: item?.url });
    });
  }

  close(): void {
    if (!this.videoSettingsForm.valid) {
      return;
    }
    this.modal.close(this.videoSettingsForm.value as VideoDataModel);
  }

  dismiss(): void {
    this.modal.dismiss();
  }
}
