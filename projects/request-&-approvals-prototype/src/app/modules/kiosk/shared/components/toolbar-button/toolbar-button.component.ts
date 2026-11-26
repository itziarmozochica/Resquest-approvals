import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-toolbar-button',
  styleUrl: './toolbar-button.component.scss',
  templateUrl: './toolbar-button.component.html',
})
export class ToolbarButtonComponent {
  readonly isDisabled = input(false);
  readonly onClicked = input<() => void>(() => {});
}
