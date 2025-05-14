import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import {
  concatMap,
  delay,
  finalize,
  map,
  mergeMap,
  switchMap,
  tap,
} from 'rxjs/operators';
import { Observable, forkJoin, of } from 'rxjs';
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
    const interval = this.scheduleForm.get('interval')?.value;

    if (
      templateId &&
      listId &&
      batchSize &&
      campaignName &&
      sendDate &&
      sendTime &&
      interval
    ) {
      this.spinnerService.show();

      const chunks$ = this.iterableService.getListUsers(listId, batchSize);

      const campaignDb: CampaignDb = {
        id: 0,
        campaignCount: 0,
        name: campaignName,
        tags: [],
      };

      const campaingListDbs: CampaignListDb[] = [];

      chunks$
        .pipe(
          map((subscribers) => {
            subscribers.map((subscriber, index) => {
              const sendAt = this.getSendDate(index);
              campaignDb.campaignCount++;
              return this.iterableService
                .createBlast(subscriber, index + 1, {
                  campaignName,
                  batchSize,
                  interval,
                  listId,
                  sendAt,
                  supressionList,
                  templateId,
                })
                .subscribe((list) => campaingListDbs.push(list));
            });
          }),

          // forkJoin(
          //   subscribers.map((subscriber, i) =>
          //     this.iterableService
          //       .createStaticList({
          //         name: `${campaignName} List ${i + 1}`,
          //         description: `List Sample ${i + 1}`,
          //       })
          //       .pipe(
          //         concatMap((staticListResponse) => {
          //           const createSubscriberList$ = this.iterableService
          //             .createSubscriberList({
          //               listId: staticListResponse.listId,
          //               updateExistingUsersOnly: true,
          //               subscribers: subscriber,
          //             });

          //           const createCampaignRequest = {
          //             name: campaignName,
          //             dataFields: null,
          //             defaultTimeZone: 'America/New_York',
          //             listIds: [staticListResponse.listId],
          //             sendAt: this.getSendDate(i),
          //             sendMode: 'RecipientTimeZone',
          //             startTimeZone: 'America/New_York',
          //             suppressionListIds: supressionList,
          //             templateId: templateId,
          //           };

          //           const createCampagin$ = this.iterableService
          //             .createCampaign(createCampaignRequest)
          //             .pipe(
          //               concatMap((createCampaignResponse) =>
          // of({
          //   id: 0,
          //   defaultTimeZone:
          //     createCampaignRequest.defaultTimeZone,
          //   sendAt: createCampaignRequest.sendAt,
          //   startTimeZone:
          //     createCampaignRequest.startTimeZone,
          //   emails: subscriber.map((s) => s.email),
          //   iterableCampaignId:
          //     createCampaignResponse.campaignId,
          //   iterableListId: staticListResponse.listId,
          //   iterableTemplateId: templateId,
          //   name: `${campaignName} List ${i + 1}`,
          //   order: i + 1,
          // })
          //               )
          //             );

          //           return forkJoin({
          //             createCampagin$,
          //             createSubscriberList$,
          //           });
          //         }),
          //         tap({
          //           next: (val) =>
          //             console.log('Result campaing/subscriber ', val),
          //           complete: () =>
          //             console.log('Completed campaing/subscriber'),
          //           error: (err) =>
          //             console.log('Error campaing/subscriber ', err),
          //         })
          //       )
          //   )
          // )
          //),
          // tap({
          //   next: (val) => console.log('Result staticListRequests ', val),
          //   complete: () => console.log('Completed staticListRequests'),
          //   error: (err) => console.log('Error staticListRequests ', err),
          // }),
          finalize(() => console.log('Insert Completed'))
        )
        .subscribe((data) => {
          console.log(campaignDb, campaingListDbs);

          // campaignDb.campaignCount = data.length;
          // data.forEach((val, _) => {
          //   campaingListDbs.push(val.createCampagin$);
          // });
          // const lists = campaingListDbs.sort((a, b) => a.order - b.order);
          // console.log('Sort', lists);
          // this.databaseService
          //   .createCampaign(campaignDb)
          //   .pipe(
          //     switchMap((campaign) =>
          //       forkJoin(
          //         lists.map((list) =>
          //           this.databaseService
          //             .createCampaignList(list, campaign.id)
          //             .pipe(delay(6000))
          //         )
          //       )
          //     ),
          //     tap({
          //       next: (val) => console.log('Result createCampaign ', val),
          //       complete: () => console.log('Completed createCampaign'),
          //       error: (err) => console.log('Error createCampaign ', err),
          //     }),
          //     finalize(() => console.log('Database Completed'))
          //   )
          //   .subscribe((result) => {
          //     console.log('Database', result);
          //     this.spinnerService.hide();
          //     this.router.navigate(['/campaigns']);
          //   });
        });
    }
  }

  getSendDate(i: number) {
    const sendDate = this.scheduleForm.get('sendDate')?.value?.utc();
    const sendTime = this.scheduleForm.get('sendTime')?.value?.utc();
    const interval = this.scheduleForm.get('interval')?.value;
    let result = '';
    if (sendDate && sendTime && interval) {
      const h = sendTime?.get('hour');
      const m = sendTime?.get('minute');
      sendDate.set('hour', h);
      sendDate.set('minute', m);
      result = sendDate.add(interval * i, 'm').format('YYYY-MM-DD HH:mm:ss');
    }
    console.log('getSendDate', i, sendDate, result);
    return result;
  }
}
