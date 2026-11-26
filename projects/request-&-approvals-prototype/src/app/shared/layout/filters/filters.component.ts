import { Component } from '@angular/core';

import { DualScreenStorageService } from '../../services/dual-screen/dual-screen-storage.service';

@Component({
  selector: 'app-filters',
  standalone: false,
  templateUrl: './filters.component.html',
  styleUrls: ['./filters.component.scss'],
})
export class FiltersComponent {
  constructor(private dualScreenStorageService: DualScreenStorageService) {}

  getDualScreenClass(): string | null {
    return this.dualScreenStorageService.containsData() ? 'bl-filters-row--dual-screen' : null;
  }
}
