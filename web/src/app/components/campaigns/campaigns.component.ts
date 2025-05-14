import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  MsalModule,
} from '@azure/msal-angular';
import { forkJoin, Observable } from 'rxjs';
import {
  delay,
  filter,
  mergeMap,
  switchMap,
  toArray,
} from 'rxjs/operators';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TitleCasePipe, UpperCasePipe } from '@angular/common';

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

import { DatabaseService } from '../../services/database.service';
import { IterableService } from '../../services/iterable.service';

import { AppStore } from '../../app.store';
import { SnackbarMessageComponent } from '../../shared/snackbar-message/snackbar-message.component';

import { CampaignRead } from '../../view-models/campaign/campaignRead.model';
import { ArchiveCampaignRequest } from '../../view-models/archive/request/archiveCampaignRequest.model';

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
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MsalModule,
    TitleCasePipe,
    UpperCasePipe,
  ],
  templateUrl: './campaigns.component.html',
  styleUrl: './campaigns.component.scss',
})
export class CampaignsComponent implements OnInit {
  campaigns$!: Observable<CampaignRead[]>;
  columnsToDisplay = ['name', 'campaignCount'];
  columnsOptions = ['options'];
  columnsToDisplayWithExpand = [
    ...this.columnsToDisplay,
    ...this.columnsOptions,
    'expand',
  ];
  expandedElement: CampaignRead | null = null;

  loading = signal(false);
  readonly store = inject(AppStore);

  constructor(
    private iterableService: IterableService,
    private databaseService: DatabaseService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.campaigns$ = this.databaseService.getCampaigns();
  }

  isExpanded(element: CampaignRead) {
    return this.expandedElement === element;
  }

  toggle(element: CampaignRead) {
    this.expandedElement = this.isExpanded(element) ? null : element;
  }

  archive(element: CampaignRead) {
    const request: ArchiveCampaignRequest = {
      campaignIds: element.lists.map((list) => list.iterableCampaignId),
    };

    const listIds = element.lists.map((list) => list.iterableListId);

    this.iterableService
      .archiveCampaign(request)
      .pipe(
        switchMap(() => this.databaseService.deleteCampaign(element.id)),
        delay(3000),
        mergeMap(() =>
          forkJoin(
            listIds.map((id) =>
              this.iterableService.deleteList(id).pipe(delay(3000))
            )
          )
        )
      )
      .subscribe((result) => {
        console.log(result);
        this.snackBar.openFromComponent(SnackbarMessageComponent, {
          duration: 5000,
          data: {
            message: 'Record Deleted',
          },
        });

        this.campaigns$ = this.campaigns$.pipe(
          mergeMap((campaigns) => campaigns),
          filter((campaign) => campaign.id != element.id),
          toArray()
        );
      });
  }
}
