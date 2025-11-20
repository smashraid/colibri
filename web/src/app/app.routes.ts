import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

// import { CampaignsComponent } from './components/campaigns/campaigns.component';
// import { AddCampaignComponent } from './components/campaigns/add-campaign/add-campaign.component';
// import { ListCampaignComponent } from './components/campaigns/list-campaign/list-campaign.component';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
  },
  // {
  //   path: 'campaigns',
  //   title: 'Campaigns',
  //   component: CampaignsComponent,
  //   canActivate: [MsalGuard],
  // },
  // {
  //   path: 'add-campaign',
  //   title: 'Add Campaign',
  //   component: AddCampaignComponent,
  //   canActivate: [MsalGuard],
  // },
  // {
  //   path: 'list-campaign/:campaignId',
  //   title: 'List Campaign',
  //   component: ListCampaignComponent,
  //   canActivate: [MsalGuard],
  // },
  {
    path: 'blasts',
    loadChildren: () =>
      import('./features/blasts/blasts.routes').then((m) => m.BLASTS_ROUTES),
  },
  {
    path: 'calendar',
    loadChildren: () =>
      import('./features/calendar/calendar.routes').then(
        (m) => m.CALENDAR_ROUTES
      ),
  },
];
