import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ignt-dialog-content',
  standalone: true,
  styleUrl: './dialog-content.component.scss',
  templateUrl: './dialog-content.component.html',
})
export class IgntDialogContentComponent {}
