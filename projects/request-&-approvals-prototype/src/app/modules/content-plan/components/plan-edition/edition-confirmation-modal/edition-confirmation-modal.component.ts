import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-edition-confirmation-modal',
  standalone: false,
  templateUrl: './edition-confirmation-modal.component.html',
  styleUrls: ['./edition-confirmation-modal.component.scss'],
})
export class EditionConfirmationModalComponent {
  @Input() infoText = '';
  @Input() confirmCheckboxText = '';
  @Output() response = new EventEmitter<boolean>();
  isConfirmationModalChecked = false;
}
