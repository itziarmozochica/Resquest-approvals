import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';

import { IGNT_DIALOG_DATA, IgntDialogCloseDirective, IgntDialogModule } from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { VideoDialogData } from './video-dialog.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntDialogCloseDirective, IgntDialogModule, IgntIconButtonComponent, TranslateModule],
  selector: 'app-video-dialog',
  standalone: true,
  styleUrl: './video-dialog.component.scss',
  templateUrl: './video-dialog.component.html',
})
export class VideoDialogComponent {
  readonly data = inject<VideoDialogData>(IGNT_DIALOG_DATA);
  readonly hasLoadError: WritableSignal<boolean> = signal(false);

  onVideoError(): void {
    this.hasLoadError.set(true);
  }
}
