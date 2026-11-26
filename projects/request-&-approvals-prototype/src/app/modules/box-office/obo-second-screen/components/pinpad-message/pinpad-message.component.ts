import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pinpad-message',
  standalone: false,
  templateUrl: './pinpad-message.component.html',
  styleUrls: ['./pinpad-message.component.scss'],
})
export class PinpadMessageComponent {
  @Input() paymentInProgress = false;
}
