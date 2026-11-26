import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'sentenceCase', standalone: false })
export class SentenceCasePipe implements PipeTransform {
  transform(value: string | undefined | null): string | undefined | null {
    if (value == null || value.length === 0) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
