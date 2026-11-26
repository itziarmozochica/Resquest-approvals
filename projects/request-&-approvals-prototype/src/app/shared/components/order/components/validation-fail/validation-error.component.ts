import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

import { IgntAlertComponent } from '@ignite/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-validation-error-modal',
  templateUrl: './validation-error.component.html',
  styleUrls: ['./validation-error.component.scss'],
  imports: [IgntAlertComponent, NgIf, TranslateModule],
  standalone: true,
})
export class ValidationErrorComponent {
  @Input() title = '';
  @Input() message = '';
  @Input() ignorable = false;
  @Input() code = '';

  constructor(private activeModal: NgbActiveModal) {}

  force(): void {
    this.activeModal.close('force');
  }

  dismiss(): void {
    this.activeModal.close('continue');
  }
}
