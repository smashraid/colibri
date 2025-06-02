import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MsalModule } from '@azure/msal-angular';
import { forkJoin, of } from 'rxjs';
import { delay, mergeMap, switchMap } from 'rxjs/operators';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DatePipe, UpperCasePipe } from '@angular/common';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTableModule } from '@angular/material/table';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';

import { DatabaseService } from '../../services/database.service';
import { IterableService } from '../../services/iterable.service';

import { AppStore } from '../../app.store';
import { SnackbarMessageComponent } from '../../shared/snackbar-message/snackbar-message.component';

import { CampaignRead } from '../../view-models/campaign/campaignRead.model';
import { PagedMetadata } from '../../view-models/pagination.model';

@Component({
  selector: 'app-campaigns',
  imports: [
    MatToolbarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatCardModule,
    MatTimepickerModule,
    MatDatepickerModule,
    MatTableModule,
    MatListModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatMenuModule,
    MatPaginatorModule,
    MatChipsModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MsalModule,
    UpperCasePipe,
    DatePipe,
  ],
  templateUrl: './campaigns.component.html',
  styleUrl: './campaigns.component.scss',
})
export class CampaignsComponent implements OnInit {
  campaigns = signal<CampaignRead[]>([]);
  columnsToDisplay = [
    'name',
    'campaignCount',
    'createdBy',
    'createdDate',
    'projectWebsite',
    'status',
    'tags',
  ];
  columnsOptions = ['options'];
  columnsToDisplayWithExpand = [
    ...this.columnsToDisplay,
    ...this.columnsOptions,
  ];
  expandedElement: CampaignRead | null = null;

  pagedList = signal<PagedMetadata>({
    totalCount: 0,
    pageSize: 10,
    currentPage: 0,
    pageSizeOptions: [5, 10, 25],
    hasNext: false,
    hasPrevious: false,
    totalPages: 0,
  });

  loading = signal(false);
  readonly store = inject(AppStore);

  constructor(
    private iterableService: IterableService,
    private databaseService: DatabaseService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.sync();
  }

  isExpanded(element: CampaignRead) {
    return this.expandedElement === element;
  }

  toggle(element: CampaignRead) {
    this.expandedElement = this.isExpanded(element) ? null : element;
  }

  sync() {
    this.databaseService
      .getCampaignsByProject(this.store.projectId(), this.pagedList())
      .subscribe((response) => {
        const paginationResponse = response.headers.get('x-pagination');
        if (response.body && paginationResponse) {
          this.campaigns.set(response.body);
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

  archive(element: CampaignRead) {
    this.databaseService
      .getArchiveDb(element.id)
      .pipe(
        switchMap((archiveReadViewModel) =>
          this.iterableService
            .archiveCampaign({
              campaignIds: archiveReadViewModel.campaigns,
            })
            .pipe(mergeMap(() => of(archiveReadViewModel)))
        ),
        delay(5000),
        mergeMap((archiveReadViewModel) =>
          forkJoin(
            archiveReadViewModel.lists.map((id) =>
              this.iterableService.deleteList(id).pipe(delay(3000))
            )
          )
        ),
        switchMap(() => this.databaseService.deleteCampaign(element.id))
      )
      .subscribe((result) => {
        this.snackBar.openFromComponent(SnackbarMessageComponent, {
          duration: 5000,
          data: {
            message: 'Record Deleted',
          },
        });

        this.campaigns.update((prev) =>
          prev.filter((campaign) => campaign.id != element.id)
        );
      });
  }
}
