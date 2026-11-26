import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-modal-email',
  standalone: false,
  styleUrls: ['./email-modal.component.scss'],
  templateUrl: './email-modal.component.html',
})
export class EmailModalComponent {
  @Input() error = false;
  @Input() success = false;
  @Input() title = '';
  @Input() iconId = '';
}
