import { Component, inject, input, OnInit, signal } from '@angular/core';
import { DatabaseService } from '../../../services/database.service';
import { Observable } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { CampaignRead } from '../../../view-models/campaign/campaignRead.model';
import { CampaignListDb } from '../../../models/campaign/campaignList.model';
import { PagedMetadata } from '../../../core/models/domain/pagination.model';

@Component({
  selector: 'app-list-campaign',
  imports: [MatPaginatorModule, MatCardModule],
  templateUrl: './list-campaign.component.html',
  styleUrl: './list-campaign.component.scss',
})
export class ListCampaignComponent implements OnInit {
  lists = signal<CampaignListDb[]>([]);
  campaign$!: Observable<CampaignRead>;
  campaignId = input.required<number>();

  pagedList = signal<PagedMetadata>({
    totalCount: 0,
    pageSize: 10,
    currentPage: 0,
    pageSizeOptions: [5, 10, 25],
    hasNext: false,
    hasPrevious: false,
    totalPages: 0,
  });

  private readonly databaseService = inject(DatabaseService);

  ngOnInit(): void {
    this.campaign$ = this.databaseService.getCampaignDb(this.campaignId());
    this.sync();
  }

  sync() {
    this.databaseService
      .getCampaignLists(this.campaignId(), this.pagedList())
      .subscribe((response) => {
        const paginationResponse = response.headers.get('x-pagination');
        if (response.body && paginationResponse) {
          this.lists.set(response.body);
          const metadata: PagedMetadata = JSON.parse(paginationResponse);
          this.pagedList.update(() => metadata);
        }
      });
  }

  onPageChange(e: PageEvent) {
    this.pagedList.update((prev) => ({
      ...prev,
      currentPage: e.pageIndex,
      pageSize: e.pageSize,
    }));
    this.sync();
  }
}
