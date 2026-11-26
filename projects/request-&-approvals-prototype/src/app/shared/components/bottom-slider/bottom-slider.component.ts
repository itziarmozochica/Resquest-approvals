import { Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';

@Component({
  selector: 'bottom-slider',
  standalone: false,
  templateUrl: './bottom-slider.component.html',
  styleUrls: ['./bottom-slider.component.scss'],
})
export class BottomSliderComponent {
  @Input() buttonsTemplate!: TemplateRef<unknown>;
  @Input() detailsTemplate!: TemplateRef<unknown>;
  @Input() hideDetailsLabel = 'Hide details';
  @Input() showDetails = false;
  @Output() showDetailsChange = new EventEmitter<boolean>();
  @Input() showDetailsLabel = 'Show details';
  @Input() showTab = false;

  clickOnShowDetails() {
    this.showDetails = !this.showDetails;
    this.showDetailsChange.emit(this.showDetails);
  }
}
