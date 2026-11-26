import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf],
  selector: 'app-oss-tickets-section',
  standalone: true,
  styleUrls: ['./oss-tickets-section.component.scss'],
  templateUrl: './oss-tickets-section.component.html',
})
export class OssTicketsSectionComponent {
  @Input() isMobile = false;
  @Input() isTablet = false;
}
