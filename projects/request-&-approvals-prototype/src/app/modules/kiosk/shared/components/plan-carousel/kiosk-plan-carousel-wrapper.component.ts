import { Component, Input, OnInit } from '@angular/core';

import { Plan } from '../../../../../shared/models/plan/plan.model';

@Component({
  selector: 'app-kiosk-plan-carousel-wrapper',
  standalone: false,
  templateUrl: './kiosk-plan-carousel-wrapper.component.html',
  styleUrls: ['./plan-carousel-wrapper.scss'],
})
export class KioskPlanCarouselWrapperComponent implements OnInit {
  @Input() plans: Plan[] = [];
  @Input() onItemClicked: (plan: Plan) => void;

  sections: Plan[][] = [];

  ngOnInit(): void {
    this.sections = this.splitPlans(this.plans, 4);
  }

  splitPlans(array: Plan[], size: number): Plan[][] {
    return array.reduce((resultArray: Plan[][], item: Plan, index: number) => {
      const chunkIndex = Math.floor(index / size);

      if (!resultArray[chunkIndex]) {
        resultArray[chunkIndex] = [];
      }

      resultArray[chunkIndex].push(item);
      return resultArray;
    }, []);
  }
}
