import { CdkPortal } from '@angular/cdk/portal';
import { Directive } from '@angular/core';

@Directive({
  selector: 'ng-template[igntMenuItemCustomTemplate]',
  standalone: true,
})
export class IgntMenuItemCustomTemplateDirective extends CdkPortal {}
