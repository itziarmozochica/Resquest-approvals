import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-spinner-modal',
  standalone: false,
  templateUrl: './spinner-modal.component.html',
  styleUrls: ['./spinner-modal.component.scss'],
})
export class SpinnerModalComponent {
  @Input() message = '';
}
