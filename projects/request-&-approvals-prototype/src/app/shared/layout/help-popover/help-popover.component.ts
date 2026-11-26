import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-help-popover',
  standalone: false,
  templateUrl: './help-popover.component.html',
  styleUrls: ['./help-popover.component.scss'],
})
export class HelpPopoverComponent {
  @Input() text: string;
}
