import { inject, Injectable } from '@angular/core';

import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { saveAs } from 'file-saver';

import { ExportTypeEnum } from '../../components/export-list-button/export-option.model';

@Injectable({
  providedIn: 'root',
})
export class DownloadFilesService {
  #dualScreenStorageService = inject(DualScreenStorageService);
  #isDualScreen = this.#dualScreenStorageService.containsData();

  downloadFile(buffer: Blob, fileType: ExportTypeEnum, fileName: string): void {
    const file = this.generateFile(buffer, fileType);
    if (!this.#isDualScreen) {
      saveAs(file, fileName);
    } else {
      this.#downloadFileForAndroid(file, fileName, fileType);
    }
  }

  generateFile(buffer: Blob, fileType: ExportTypeEnum): Blob {
    return new Blob([buffer], {
      type: `${fileType};charset=utf-8`,
    });
  }

  #downloadFileForAndroid(blob: Blob, fileName: string, mimeType: string): void {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      // AndroidFileSaver is declared in the android app
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).AndroidFileSaver?.saveBase64File(base64, fileName, mimeType);
    };
    reader.readAsDataURL(blob);
  }
}
