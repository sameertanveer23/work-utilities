import type { Routes } from '@angular/router';
import { UTILITIES } from './core/utility-registry';

/** Every utility route is derived from the registry - never hand-written. */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Dev Utilities',
    loadComponent: () => import('./features/welcome/welcome').then((m) => m.Welcome),
  },
  ...UTILITIES.map((utility) => ({
    path: utility.path,
    title: `${utility.title} · Dev Utilities`,
    data: { utilityId: utility.id },
    loadComponent: utility.loadComponent,
  })),
  {
    path: '**',
    title: 'Not found · Dev Utilities',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
