import { Routes } from '@angular/router';

import { AddBlast } from './pages/add-blast/add-blast';
import { Blasts } from './pages/blasts/blasts';

export const BLASTS_ROUTES: Routes = [
  {
    path: '',
    component: Blasts,
    title: 'Blasts',
  },
  {
    path: 'add-blast',
    component: AddBlast,
    title: 'Create New Blast',
  },
];
