import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { HomeComponent } from './pages/home/home.component';
import { CampaignsComponent } from './components/campaigns/campaigns.component';
import { AddCampaignComponent } from './components/campaigns/add-campaign/add-campaign.component';
import { ListCampaignComponent } from './components/campaigns/list-campaign/list-campaign.component';

export const routes: Routes = [
  { path: '', title: 'Home', component: HomeComponent },
  {
    path: 'campaigns',
    title: 'Campaigns',
    component: CampaignsComponent,
    canActivate: [MsalGuard],
  },
  {
    path: 'add-campaign',
    title: 'Add Campaign',
    component: AddCampaignComponent,
    canActivate: [MsalGuard],
  },
  {
    path: 'list-campaign/:campaignId',
    title: 'List Campaign',
    component: ListCampaignComponent,
    canActivate: [MsalGuard],
  },
];
