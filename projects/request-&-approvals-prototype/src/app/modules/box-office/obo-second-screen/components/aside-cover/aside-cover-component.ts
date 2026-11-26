import { Component, Input } from '@angular/core';

import { SliderItem } from '../../../../../shared/components/sliders/ken-burns-slider/ken-burns-slider.component';

@Component({
  selector: 'app-aside-cover',
  standalone: false,
  templateUrl: './aside-cover.component.html',
  styleUrls: ['./aside-cover.component.scss'],
})
export class AsideCoverComponent {
  @Input() imageUrl: string | undefined;
  @Input() items: SliderItem[] = [];
  @Input() paymentInProgress = false;

  get hasCarouselItems(): boolean {
    return this.items.length > 1;
  }
}
