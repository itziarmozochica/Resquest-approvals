import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PatnerIconLoaderService {
  private readonly assetsFaviconsFolder = 'assets/favicons/';

  constructor(@Inject(DOCUMENT) private document: Document) {}

  setIcon(partnerId: number | null): void {
    const partnerFolder: string = partnerId === null ? '' : `partners/${partnerId}/`;
    const linksHtml: NodeListOf<HTMLLinkElement> = this.document.querySelectorAll('link');
    linksHtml.forEach(link => {
      if (link['rel'] === 'icon' || link['rel'] === 'shortcut icon' || link['rel'] === 'apple-touch-icon') {
        link.setAttribute('href', this.buildUrlFavicon(link['href'], partnerFolder));
      }
    });
  }

  private buildUrlFavicon(url: string, partnerFolder: string): string {
    const lastPosition = url.lastIndexOf('/') + 1;
    const icon = url.substring(lastPosition);
    return ''.concat(this.assetsFaviconsFolder, partnerFolder, icon);
  }
}
