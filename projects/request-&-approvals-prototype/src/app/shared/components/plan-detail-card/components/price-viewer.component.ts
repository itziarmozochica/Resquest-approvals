/* eslint-disable no-console */
import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';

import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PriceViewerStatus } from '../../../services/price-viewer/models/price-viewer-status.model';
import { PriceViewerPrinterServiceManager } from '../../../services/price-viewer/price-viewer.service';

@Component({
  selector: 'app-price-viewer',
  templateUrl: './price-viewer.component.html',
  styleUrls: ['price-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IconsModule, TranslateModule, NgIf],
})
export class PriceViewerComponent implements OnInit, OnDestroy {
  priceViewerStatus: PriceViewerStatus = PriceViewerStatus.DISCONNECTED;
  private destroy$ = new Subject<void>();

  constructor(
    private priceViewer: PriceViewerPrinterServiceManager,
    private ref: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.priceViewerStatus = this.priceViewer.lastStatus();
    this.priceViewer
      .status()
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.priceViewerStatus = status;
        this.ref.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  force() {
    this.priceViewer.connect(true).subscribe();
  }
}
