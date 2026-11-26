import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-modal-video',
  standalone: false,
  styleUrls: ['./modal-video.component.scss'],
  templateUrl: './modal-video.component.html',
})
export class ModalVideoComponent {
  @Input() srcVideo = '';
}
