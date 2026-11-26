import { Injectable } from '@angular/core';
import { Router, Routes } from '@angular/router';

import { OptimizelyService } from '../../optimizely/optimizely.service';
import { PrivateRoutesFactory } from '../../routes/private-routes';
import { UserService } from '../user/user.service';

@Injectable({
  providedIn: 'root',
})
export class DynamicRoutingService {
  constructor(
    private optimizelyService: OptimizelyService,
    private userService: UserService,
    private router: Router,
    private privateRoutesFactory: PrivateRoutesFactory,
  ) {}

  updateRouting(): void {
    const newRoutes = this.getUpdatedRoutes(this.router.config);
    this.router.resetConfig(newRoutes);
  }

  private getUpdatedRoutes(previousRoutes: Routes): Routes {
    return this.privateRoutesFactory.getUpdatedRoutes(previousRoutes, this.optimizelyService, this.userService);
  }
}
