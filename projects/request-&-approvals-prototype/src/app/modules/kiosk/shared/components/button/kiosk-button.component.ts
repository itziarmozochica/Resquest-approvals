import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';

import { IgntIconComponent, type IgntIconName } from '@ignite/icon';

@Component({
  selector: 'kiosk-button',
  templateUrl: './kiosk-button.component.html',
  styleUrls: ['./kiosk-button.component.scss'],
  standalone: true,
  imports: [NgClass, IgntIconComponent],
})
export class KioskButtonComponent {
  @Input() label = '';
  @Input() secondary = false;
  @Input() fill = false;
  @Input() disabled = false;
  @Input() compact = false;
  @Input() slim = false;
  @Input() icon?: IgntIconName;
  @Input() iconSrc?: string;
  @Input() iconTrailing = false;
}
