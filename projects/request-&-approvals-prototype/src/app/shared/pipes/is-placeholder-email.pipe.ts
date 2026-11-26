import { Pipe, PipeTransform } from '@angular/core';

import { isPlaceholderEmail } from '../utils/placeholder-email.util';

@Pipe({ name: 'isPlaceholderEmail', standalone: false })
export class IsPlaceholderEmailPipe implements PipeTransform {
  transform(email?: string | null): boolean {
    return isPlaceholderEmail(email);
  }
}
