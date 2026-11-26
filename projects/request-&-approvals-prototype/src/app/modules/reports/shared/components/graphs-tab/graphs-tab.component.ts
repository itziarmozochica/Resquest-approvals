import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Graph } from '@fz-original/app/shared/models/graph/graph.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-graphs-tab',
  standalone: true,
  styleUrls: ['./graphs-tab.component.scss'],
  templateUrl: './graphs-tab.component.html',
})
export class GraphsTabComponent {
  dataTestId = input<string>('graphs-tab');
  graphs = input<Array<Graph>>([]);
  selectedGraph = input<Graph | null>(null);
  tabSelected = output<Graph>();

  onTabClick(graph: Graph): void {
    this.tabSelected.emit(graph);
  }
}
