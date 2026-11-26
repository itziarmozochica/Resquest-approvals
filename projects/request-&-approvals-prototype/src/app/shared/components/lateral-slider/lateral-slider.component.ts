import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';

@Component({
  selector: 'app-lateral-slider',
  standalone: false,
  templateUrl: './lateral-slider.component.html',
  styleUrls: ['../../../../theme/components/containment/sheets/sheet.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LateralSliderComponent {
  @Input() closeOnBackdropClick = false;
  @Output() closeSlider = new EventEmitter<void>();
  @Input() contentTemplate?: TemplateRef<unknown>;
  @Input() disableCloseButton = false;
  @Input() hideCloseButton = false;
  @Input() inLineOnXl = false;
  @Input() showDetails = false;
  @Input() title = 'common.details';
  @Input() titleTemplate?: TemplateRef<unknown>;

  clickOnClose(): void {
    if (this.disableCloseButton) {
      return;
    }
    this.showDetails = false;
    this.closeSlider.emit();
  }
}
