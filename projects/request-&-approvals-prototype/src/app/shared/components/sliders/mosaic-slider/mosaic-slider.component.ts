import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { MainScreenBusyService } from '@fz-original/app/shared/services/dual-screen/main-screen-busy.service';
import { environment } from '@fz-original/environments/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MainScreenBusyService],
  selector: 'app-mosaic-slider',
  standalone: false,
  styleUrl: './mosaic-slider.component.scss',
  templateUrl: './mosaic-slider.component.html',
})
export class MosaicSliderComponent {
  readonly isMainScreenBusy = inject(MainScreenBusyService).isBusy;

  readonly baseDefaultPath = environment.s3.standby;
  readonly firstColumn: string[] = [
    `${this.baseDefaultPath}/Fever_01.webp`,
    `${this.baseDefaultPath}/Fever_02.webp`,
    `${this.baseDefaultPath}/Fever_03.webp`,
  ];
  readonly secondColumn: string[] = [
    `${this.baseDefaultPath}/Fever_04.webp`,
    `${this.baseDefaultPath}/Fever_16.webp`,
    `${this.baseDefaultPath}/Fever_06.webp`,
  ];

  readonly thirdColumn: string[] = [
    `${this.baseDefaultPath}/Fever_07.webp`,
    `${this.baseDefaultPath}/Fever_08.webp`,
    `${this.baseDefaultPath}/Fever_09.webp`,
  ];

  readonly fourthColumn: string[] = [
    `${this.baseDefaultPath}/Fever_10.webp`,
    `${this.baseDefaultPath}/Fever_11.webp`,
    `${this.baseDefaultPath}/Fever_12.webp`,
  ];

  readonly fifthColumn: string[] = [
    `${this.baseDefaultPath}/Fever_13.webp`,
    `${this.baseDefaultPath}/Fever_14.webp`,
    `${this.baseDefaultPath}/Fever_15.webp`,
  ];

  imagesList: string[][] = [
    this.firstColumn.concat(this.firstColumn),
    this.secondColumn.concat(this.secondColumn),
    this.thirdColumn.concat(this.thirdColumn),
    this.fourthColumn.concat(this.fourthColumn),
    this.fifthColumn.concat(this.fifthColumn),
  ];
}
