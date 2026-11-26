import { Injectable } from '@angular/core';

const LETTER_EQUIVALENT: Record<string, number> = {
  ñ: 164,
  Ñ: 165,
  á: 160,
  Á: 160,
  é: 130,
  É: 130,
  í: 161,
  Í: 161,
  ó: 162,
  Ó: 162,
  ú: 163,
  Ú: 163,
};

@Injectable({
  providedIn: 'root',
})
export class BixolonBdc2000EncoderService {
  encode(text: string): (Uint8Array | ArrayBuffer)[] {
    const buffers = [];
    for (let i = 0; i < text.length; i++) {
      let buffer;
      const char = text.charAt(i);
      if (LETTER_EQUIVALENT[char]) {
        buffer = new Uint8Array([LETTER_EQUIVALENT[char]]);
      } else {
        buffer = new TextEncoder().encode(char).buffer;
      }

      buffers.push(buffer);
    }
    return buffers;
  }
}
