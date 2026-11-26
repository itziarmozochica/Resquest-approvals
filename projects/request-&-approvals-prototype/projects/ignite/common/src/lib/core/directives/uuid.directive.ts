import { Directive } from '@angular/core';

import { v4 as uuidv4 } from 'uuid';

@Directive({
  exportAs: 'igntUUID',
  selector: '[igntUUID]',
  standalone: true,
})
export class IgntUUIDDirective {
  readonly uuid: string = uuidv4();
}
