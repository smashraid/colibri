import { Component, inject, input, OnInit } from '@angular/core';
import { DatabaseService } from '../../../services/database.service';
import { Observable } from 'rxjs';
import { CampaignListDb } from '../../../models/campaign/campaignList.model';
import { AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { CampaignRead } from '../../../view-models/campaign/campaignRead.model';

@Component({
  selector: 'app-list-campaign',
  imports: [MatCardModule, AsyncPipe],
  templateUrl: './list-campaign.component.html',
  styleUrl: './list-campaign.component.scss',
})
export class ListCampaignComponent implements OnInit {
  lists$!: Observable<CampaignListDb[]>;
  campaign$!: Observable<CampaignRead>;
  campaignId = input.required<number>();
  private readonly databaseService = inject(DatabaseService);

  ngOnInit(): void {
    this.campaign$ = this.databaseService.getCampaignDb(this.campaignId());
    this.lists$ = this.databaseService.getCampaignLists(this.campaignId());
  }
}
