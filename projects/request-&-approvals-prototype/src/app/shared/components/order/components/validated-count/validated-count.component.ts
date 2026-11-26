import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-validated-count',
  standalone: false,
  templateUrl: './validated-count.component.html',
  styleUrls: ['./validated-count.component.scss'],
})
export class ValidatedCountComponent {
  @Input() validated = 0;
  @Input() total = 0;
  @Input() small = false;
}
