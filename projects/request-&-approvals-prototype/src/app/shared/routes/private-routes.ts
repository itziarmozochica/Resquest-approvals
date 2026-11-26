import { Injectable } from '@angular/core';
import { Route, Routes } from '@angular/router';

import type { OptimizelyService } from '../optimizely/optimizely.service';
import type { UserService } from '../services/user/user.service';
import { LayoutComponent } from '../layout/layout.component';
import { LogoutComponent } from '../../modules/user/logout/logout.component';
import { RoutesFactory } from './app-routes';

type PathMatch = 'full' | 'prefix' | undefined;

/**
 * Prototype routes: only the "Requests & Approval" area is reachable.
 * Everything else in the FeverZone menu is rendered but not navigable.
 */
@Injectable({
  providedIn: 'root',
})
export class PrivateRoutesFactory extends RoutesFactory {
  static getRoutes(_optimizelyService?: OptimizelyService, _userService?: UserService): Routes {
    const children: Routes = [
      { path: '', pathMatch: 'full' as PathMatch, redirectTo: 'project-management/projects' },
      { component: LogoutComponent, path: 'logout' },
      {
        path: 'project-management',
        loadChildren: async () =>
          await import('../../modules/project-management/project-management.module')
            .then(m => m.ProjectManagementModule)
            .catch((err: unknown) => PrivateRoutesFactory.reloadIfChunkLoadError(err as { message?: string; name?: string })),
      },
      { path: 'launches', pathMatch: 'full', redirectTo: 'project-management/projects' },
      {
        path: 'admin/project-management/settings',
        loadChildren: async () =>
          await import('../../modules/admin-project-management-settings/admin-project-management-settings.module')
            .then(m => m.AdminProjectManagementSettingsModule)
            .catch((err: unknown) => PrivateRoutesFactory.reloadIfChunkLoadError(err as { message?: string; name?: string })),
      },
    ];

    return [{ children, component: LayoutComponent, path: '' }];
  }

  getUpdatedRoutes(currentRoutes: Routes, optimizelyService: OptimizelyService, userService: UserService): Routes {
    const initialRoutes: Routes = PrivateRoutesFactory.getRoutes(optimizelyService, userService);
    const updatedRoutes = currentRoutes.map((route: Route) => {
      const initialRoute: Route | undefined = initialRoutes.find(initialRoute => initialRoute.path === route.path);
      return initialRoute ?? route;
    });
    const missingRoutes = initialRoutes.filter(initialRoute => !updatedRoutes.some(route => route.path === initialRoute.path));
    if (missingRoutes.length === 0) {
      return updatedRoutes;
    }
    const wildcardIndex = updatedRoutes.findIndex(route => route.path === '**');
    if (wildcardIndex === -1) {
      return [...updatedRoutes, ...missingRoutes];
    }
    return [...updatedRoutes.slice(0, wildcardIndex), ...missingRoutes, ...updatedRoutes.slice(wildcardIndex)];
  }
}
