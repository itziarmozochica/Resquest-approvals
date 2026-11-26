import { Injectable } from '@angular/core';

import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GooglePlacesService {
  getMapImageUrl(latitude: number, longitude: number): string | null {
    if (!latitude || !longitude) {
      return null;
    }
    const marker = `markers=color:red%7C${latitude},${longitude}`;
    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    const center = `${latitude},${longitude}`;
    const zoom = 15;
    const size = '600x300';
    const maptype = 'roadmap';
    const key = environment.googleMapsApiKey;

    return `${baseUrl}?center=${center}&zoom=${zoom}&size=${size}&maptype=${maptype}&key=${key}&${marker}`;
  }
}
