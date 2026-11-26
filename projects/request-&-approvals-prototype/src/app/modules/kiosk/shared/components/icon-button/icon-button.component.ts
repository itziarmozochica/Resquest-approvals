import { NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon-button',
  templateUrl: './icon-button.component.html',
  styleUrls: ['./icon-button.component.scss'],
  standalone: true,
  imports: [NgIf, NgFor],
})
export class IconButtonComponent {
  @Input() customClass = '';
  @Input() icon: 'close' | 'plus' | 'minus' = 'close';
  @Input() disabled = false;
}
