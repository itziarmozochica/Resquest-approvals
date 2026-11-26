import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';

import { AudioFileET } from './audio-file.enum';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  #audioCache = new Map<string, HTMLAudioElement>();
  #datadogLogService = inject(DatadogLogService);

  clearCache(): void {
    this.#audioCache.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    this.#audioCache.clear();
  }

  play(audioPath: AudioFileET): void {
    const cachedAudio = this.#audioCache.get(audioPath);

    if (cachedAudio) {
      cachedAudio.currentTime = 0;
      cachedAudio.play().catch(error => {
        this.#datadogLogService.logError('Error playing cached audio', { audioPath, error });
      });
      return;
    }

    const audio = new Audio(audioPath);
    this.#audioCache.set(audioPath, audio);

    audio.play().catch(error => {
      this.#datadogLogService.logError('Error playing audio', { audioPath, error });
    });
  }

  preload(audioPath: AudioFileET): void {
    if (this.#audioCache.has(audioPath)) {
      return;
    }

    const audio = new Audio(audioPath);
    audio.preload = 'auto';
    audio.load();
    this.#audioCache.set(audioPath, audio);
  }

  stop(audioPath: AudioFileET): void {
    const audio = this.#audioCache.get(audioPath);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }
}
