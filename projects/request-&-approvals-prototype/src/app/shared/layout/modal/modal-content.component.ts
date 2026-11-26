import { Component, inject, Input } from '@angular/core';

import { IconName } from '@fortawesome/pro-solid-svg-icons';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-modal-content',
  standalone: false,
  templateUrl: './modal-content.component.html',
  styleUrls: ['./modal-content.component.scss'],
})
export class ModalContentComponent {
  activeModal = inject(NgbActiveModal);
  @Input() hasCloseButton = true;
  @Input() hasNavigation = false;
  @Input() iconId: IconName | undefined;
  @Input() title = '';
}
