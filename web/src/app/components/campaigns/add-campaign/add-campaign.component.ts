import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import {
  bufferCount,
  concatAll,
  concatMap,
  delay,
  finalize,
  map,
  mergeMap,
  skip,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';
import { Observable, forkJoin, interval, lastValueFrom, of } from 'rxjs';
import moment from 'moment';

import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CampaignListIterable } from '../../../view-models/campaign/campaignListIterable.model';
import { TemplateIterable } from '../../../view-models/template/templateIterable.model';
import { CampaignDb } from '../../../models/campaign/campaing.model';
import { CampaignListDb } from '../../../models/campaign/campaignList.model';

import { IterableService } from '../../../services/iterable.service';
import { DatabaseService } from '../../../services/database.service';
import { SpinnerService } from '../../../services/spinner.service';

@Component({
  selector: 'app-add-campaign',
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
    MatSnackBarModule,
    MatProgressSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    AsyncPipe,
  ],
  templateUrl: './add-campaign.component.html',
  styleUrl: './add-campaign.component.scss',
})
export class AddCampaignComponent implements OnInit {
  campaignLists$!: Observable<CampaignListIterable[]>;
  template$!: Observable<TemplateIterable>;
  emailCount$!: Observable<number>;
  emails$!: Observable<string[]>;

  readonly configurationType = new FormControl<number>(1);

  validateInformationForm = new FormGroup({
    templateId: new FormControl<number | null>(null, [Validators.required]),
    listId: new FormControl<number | null>(null, [Validators.required]),
  });

  scheduleForm = new FormGroup({
    campaignName: new FormControl('', [Validators.required]),
    supressionList: new FormControl<number | null>(null, []),
    batchSize: new FormControl<number | null>(null, [Validators.required]),
    sendDate: new FormControl(moment(), [Validators.required]),
    sendTime: new FormControl(moment(), [Validators.required]),
    interval: new FormControl<number | null>(null, [Validators.required]),
  });

  scheduleManualForm = new FormGroup({});

  constructor(
    private iterableService: IterableService,
    private databaseService: DatabaseService,
    private spinnerService: SpinnerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.campaignLists$ = this.iterableService.getListByType();
  }

  getTemplateListInfo() {
    const templateId = this.validateInformationForm.get('templateId')?.value;
    const listId = this.validateInformationForm.get('listId')?.value;

    if (templateId && listId) {
      this.template$ = this.iterableService.getTemplateById(templateId);

      this.emailCount$ = this.iterableService.getListSize(listId);
    }
  }

  async createCampaignBatch() {
    const templateId = this.validateInformationForm.get('templateId')?.value;
    const listId = this.validateInformationForm.get('listId')?.value;
    const supressionList = this.scheduleForm.get('supressionList')?.value;
    const batchSize = this.scheduleForm.get('batchSize')?.value;
    const campaignName = this.scheduleForm.get('campaignName')?.value;
    const sendDate = this.scheduleForm.get('sendDate')?.value?.utc();
    const sendTime = this.scheduleForm.get('sendTime')?.value?.utc();
    const intervalTime = this.scheduleForm.get('interval')?.value;
    const FORMAT_DATE = 'YYYY-MM-DD HH:mm:ss';

    if (
      templateId &&
      listId &&
      batchSize &&
      campaignName &&
      sendDate &&
      sendTime &&
      intervalTime
    ) {
      this.spinnerService.show();

      const chunks$ = this.iterableService.getListUsers(listId, batchSize);

      const h = sendTime.get('hour');
      const m = sendTime.get('minute');
      sendDate.set('hour', h);
      sendDate.set('minute', m);

      const campaignDb: CampaignDb = {
        id: 0,
        campaignCount: 0,
        name: campaignName,
        tags: [],
      };

      const blasts$ = chunks$
        .pipe(
          map((subscribers) =>
            subscribers.map((subscriber, index) => {
              const order = index + 1;
              sendDate.add(intervalTime * index, 'm');
              return this.iterableService.createBlast2({
                campaignName,
                listName: `${campaignName} Blast List ${order}`,
                listDescription: `Blast List ${order}`,
                listId,
                sendAt: sendDate.format(FORMAT_DATE),
                supressionList,
                templateId,
                order,
                subscribers: subscriber,
              });
            })
          ),
          finalize(() => console.log('Insert Completed'))
        )
        .pipe(
          concatMap((data) => data),
          bufferCount(1),
          concatMap((batch) => forkJoin(batch)),
          delay(9000)
        );

      this.databaseService.createCampaign(campaignDb).subscribe((campaign) => {
        blasts$.subscribe({
          next: (lists) =>
            this.databaseService.createCampaignLists(lists, campaign.id),
          complete: () => {
            this.spinnerService.hide();
            this.router.navigate(['/campaigns']);
          },
          error: (err) => console.log(err),
        });
      });
    }
  }
}
