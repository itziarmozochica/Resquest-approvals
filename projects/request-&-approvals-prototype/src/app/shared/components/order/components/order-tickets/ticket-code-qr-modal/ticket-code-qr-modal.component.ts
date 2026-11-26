import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { QrGeneratorService } from '@fz-original/app/shared/services/qr-generator/qr-generator.service';
import { IGNT_DIALOG_DATA, IgntDialogContentComponent, IgntDialogHeaderComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

export interface TicketCodeQrModalData {
  code: string;
  imageUrl: string | null;
}

const IMAGE_SIZE_PX = 240;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntDialogContentComponent, IgntDialogHeaderComponent, TranslateModule],
  selector: 'app-ticket-code-qr-modal',
  standalone: true,
  styleUrl: './ticket-code-qr-modal.component.scss',
  templateUrl: './ticket-code-qr-modal.component.html',
})
export class TicketCodeQrModalComponent {
  readonly #data = inject<TicketCodeQrModalData>(IGNT_DIALOG_DATA);
  readonly #qrGenerator = inject(QrGeneratorService);

  protected readonly code = this.#data.code;
  protected readonly imageSize = IMAGE_SIZE_PX;
  protected readonly imageSrc = signal<string | null>(this.#data.imageUrl || null);

  constructor() {
    if (!this.imageSrc()) {
      this.#generateQr();
    }
  }

  protected onImageError(): void {
    this.imageSrc.set(null);
    this.#generateQr();
  }

  #generateQr(): void {
    void this.#qrGenerator.generateQr(this.code, { width: IMAGE_SIZE_PX * 2 }).then(dataUrl => this.imageSrc.set(dataUrl));
  }
}
