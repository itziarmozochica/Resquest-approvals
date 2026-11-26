import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

type ProgressBarColor = 'primary' | 'danger';
type ProgressPercentagePosition = 'start' | 'end' | 'center';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
  @Input() percentage = 0;
  @Input() sentiment: ProgressBarColor = 'primary';
  @Input() percentagePosition: ProgressPercentagePosition = 'end';
}
