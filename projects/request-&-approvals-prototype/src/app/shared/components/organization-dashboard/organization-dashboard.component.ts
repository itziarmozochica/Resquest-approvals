import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';

import { IFrameResizerModule } from '../../directives/iframe-resizer/iframe-resizer.module';
import { IconsModule } from '../../icons/icons.module';
import { GraphGroup } from '../../models/graph/graph.group';
import { Graph } from '../../models/graph/graph.model';
import { PipesModule } from '../../pipes/pipes.module';
import { GraphService } from '../../services/graph/graph.service';
import { SearchGraphFilters } from '../../services/graph/models/search-graphs';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-organization-dashboard',
  templateUrl: './organization-dashboard.component.html',
  styleUrls: ['./organization-dashboard.component.scss'],
  imports: [TranslateModule, PipesModule, NgIf, IconsModule, IFrameResizerModule],
})
export class OrganizationDashboardComponent implements OnChanges {
  @Input() channelId?: string;
  errorGraph = false;
  graph: Graph | null = null;
  @Input() groupName?: GraphGroup = GraphGroup.affiliatesOverview;
  loadingGraph = true;
  @Input() organizationOwnerId?: number;
  @Input() resellerId?: number;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private graphService: GraphService,
  ) {}

  getOrganizationDashboard(): void {
    if ((!this.channelId && !this.resellerId && !this.organizationOwnerId) || !this.groupName) {
      return;
    }

    const filters: Partial<SearchGraphFilters> = { groupName: this.groupName };

    if (this.channelId) {
      filters.channelId = this.channelId;
    } else if (this.resellerId) {
      filters.resellerId = this.resellerId;
    }

    if (this.organizationOwnerId) {
      filters.organizationOwnerId = this.organizationOwnerId;
    }

    this.loadingGraph = true;

    this.graphService
      .searchOrganizationGraph(filters)
      .pipe(
        finalize(() => {
          this.loadingGraph = false;
          this.changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (graphs: Array<Graph>) => {
          if (!graphs || graphs.length === 0) {
            this.errorGraph = true;
            return;
          }
          this.graph = graphs[0];
          this.errorGraph = false;
        },
        error: () => {
          this.errorGraph = true;
        },
      });
  }

  ngOnChanges({ channelId, resellerId, organizationOwnerId, groupName }: SimpleChanges): void {
    if (
      (channelId?.currentValue && channelId.currentValue !== channelId.previousValue) ||
      (resellerId?.currentValue && resellerId.currentValue !== resellerId.previousValue) ||
      (organizationOwnerId?.currentValue && organizationOwnerId.currentValue !== organizationOwnerId.previousValue) ||
      (groupName?.currentValue && groupName.currentValue !== groupName.previousValue)
    ) {
      this.getOrganizationDashboard();
    }
  }
}
