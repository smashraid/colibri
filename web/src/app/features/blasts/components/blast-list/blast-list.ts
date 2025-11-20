import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MsalModule } from '@azure/msal-angular';
import { forkJoin, of } from 'rxjs';
import { delay, mergeMap, switchMap } from 'rxjs/operators';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DatePipe, JsonPipe, UpperCasePipe } from '@angular/common';

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
import { PagedMetadata } from '../../../../core/models/domain/pagination.model';
import { AppStore } from '../../../../app.store';
import { IterableService } from '../../../../core/services/iterable.service';
import { DatabaseService } from '../../../../core/services/database.service';
import { SnackbarMessageComponent } from '../../../../shared/components/ui/snackbar-message/snackbar-message.component';
import { BlastsResponse } from '../../models/blasts';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-blast-list',
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
    JsonPipe,
  ],
  templateUrl: './blast-list.html',
  styleUrl: './blast-list.scss',
})
export class BlastList implements OnInit {
  campaigns = signal<BlastsResponse[]>([]);
  columnsToDisplay = [
    'name',
    'batchType',
    'createdBy',
    'sendAt',
    'projectWebsite',
    'status',
    'tags',
  ];
  columnsOptions = ['options'];
  columnsToDisplayWithExpand = [
    ...this.columnsToDisplay,
    ...this.columnsOptions,
  ];
  expandedElement: BlastsResponse | null = null;

  pagedList = signal<PagedMetadata>({
    totalCount: 0,
    pageSize: 10,
    currentPage: 1,
    pageSizeOptions: [5, 10, 25],
    hasNext: false,
    hasPrevious: false,
    totalPages: 0,
  });

  loading = signal(false);
  readonly store = inject(AppStore);
  private destroyRef = inject(DestroyRef);

  constructor(
    private iterableService: IterableService,
    private databaseService: DatabaseService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.sync();
  }

  isExpanded(element: BlastsResponse) {
    return this.expandedElement === element;
  }

  toggle(element: BlastsResponse) {
    this.expandedElement = this.isExpanded(element) ? null : element;
  }

  sync() {
    this.store.startLoading();
    this.databaseService
      .getBlastsByProject(this.store.projectId(), this.pagedList())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const paginationResponse = response.headers.get('x-pagination');
          if (response.body && paginationResponse) {
            this.campaigns.set(response.body);
            const metadata: PagedMetadata = JSON.parse(paginationResponse);
            this.pagedList.update(() => metadata);
          }
        },
        error: (err) => this.store.stopLoading(),
        complete: () => this.store.stopLoading(),
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

  archive(element: BlastsResponse) {
    this.databaseService
      .getArchive(element.id)
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
