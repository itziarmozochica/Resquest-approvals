import { ViewportScroller } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SpinnerService } from '../../../shared/layout/spinner/spinner.service';
import { BaseResponse } from '../../../shared/models/base-response';
import { Graph } from '../../../shared/models/graph/graph.model';
import { Outage } from '../../../shared/models/outage/outage.model';
import { Partner } from '../../../shared/models/partner/partner.model';
import { GraphService } from '../../../shared/services/graph/graph.service';
import { OutageService } from '../../../shared/services/outage/outage.service';
import { PartnerService } from '../../../shared/services/partner/partner.service';

@Component({
  selector: 'app-sales-summary',
  standalone: false,
  templateUrl: './sales-summary.component.html',
  styleUrls: ['./sales-summary.component.scss'],
})
export class SalesSummaryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private partner: Partner | null = null;
  errorGraphs = false;
  graphs: Array<Graph> | null = null;
  loadingGraphs = false;
  outage: Outage | null = null;

  constructor(
    private partnerService: PartnerService,
    private graphService: GraphService,
    private spinnerService: SpinnerService,
    private scroller: ViewportScroller,
    private outageService: OutageService,
  ) {
    this.outageService.getOutages().subscribe((outagesResponse: BaseResponse<Outage[] | null>) => {
      if (outagesResponse.data && outagesResponse.data?.length > 0) {
        this.outage = outagesResponse.data[0];
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  ngOnInit(): void {
    this.scroller.scrollToPosition([0, 0]);
    if (!this.partnerService.getPartner()) {
      return;
    }

    this.spinnerService.show();
    this.partner = this.partnerService.getPartner();

    this.loadingGraphs = true;
    this.graphService
      .getBoxOfficeGraph()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (boxOfficeGraphs: Array<Graph>) => {
          this.graphs = boxOfficeGraphs;
          this.loadingGraphs = false;
          this.spinnerService.hide();
        },
        () => {
          this.spinnerService.hide();
          this.loadingGraphs = false;
          this.errorGraphs = true;
        },
      );
  }
}
