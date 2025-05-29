import {
  Component,
  ElementRef,
  OnInit,
  inject,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CampaignListIterable } from '../../../view-models/campaign/campaignListIterable.model';
import { TemplateIterable } from '../../../view-models/template/templateIterable.model';

import { IterableService } from '../../../services/iterable.service';
import { DatabaseService } from '../../../services/database.service';
import { SpinnerService } from '../../../services/spinner.service';

import { AppStore } from '../../../app.store';

import { CampaignCreate } from '../../../view-models/campaign/campaignCreate.model';
import { maxCampaignDays } from '../../../validators/maxCampaignDays';
import { ToastComponent } from '../../../shared/toast/toast.component';

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
    MatProgressSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    AsyncPipe,
    ToastComponent,
  ],
  templateUrl: './add-campaign.component.html',
  styleUrl: './add-campaign.component.scss',
})
export class AddCampaignComponent implements OnInit {
  private readonly store = inject(AppStore);

  campaignLists$!: Observable<CampaignListIterable[]>;
  template$!: Observable<TemplateIterable>;
  emailCount$!: Observable<number>;

  validateInformationForm = new FormGroup({
    templateId: new FormControl<number | null>(null, [Validators.required]),
    listId: new FormControl<number | null>(null, [Validators.required]),
  });

  scheduleForm = new FormGroup(
    {
      campaignName: new FormControl('', [Validators.required]),
      supressionList: new FormControl<number | null>(null, []),
      batchSize: new FormControl<number | null>(null, [Validators.required]),
      sendDate: new FormControl(moment(), [Validators.required]),
      sendTime: new FormControl(moment(), [Validators.required]),
      interval: new FormControl<number | null>(null, [Validators.required]),
      totalCount: new FormControl<number | null>({
        value: null,
        disabled: true,
      }),
    },
    { validators: maxCampaignDays() }
  );

  scheduleManualForm = new FormGroup({});

  htmlContainer = viewChild<ElementRef<HTMLDivElement>>('htmlContainer');
  preview = viewChild<ElementRef<HTMLImageElement>>('preview');

  constructor(
    private iterableService: IterableService,
    private databaseService: DatabaseService,
    private spinnerService: SpinnerService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.campaignLists$ = this.iterableService.getListByType();
  }

  sanitizedHtml(htmlString: string) {
    //return this.sanitizer.bypassSecurityTrustHtml(htmlString);
    return URL.createObjectURL(new Blob([htmlString], { type: 'text/html' }));
  }

  getTemplateListInfo() {
    const templateId = this.validateInformationForm.get('templateId')?.value;
    const listId = this.validateInformationForm.get('listId')?.value;

    if (templateId && listId) {
      this.template$ = this.iterableService.getTemplateById(templateId);

      this.emailCount$ = this.iterableService.getListSize(listId).pipe(
        switchMap((value) => {
          this.scheduleForm.patchValue({
            totalCount: value,
          });
          return of(value);
        })
      );
    }
  }

  async createCampaignBatch() {
    const sourceTemplateId =
      this.validateInformationForm.get('templateId')?.value;
    const sourceListId = this.validateInformationForm.get('listId')?.value;
    const sourceSupressionList = this.scheduleForm.get('supressionList')?.value;
    const batchSize = this.scheduleForm.get('batchSize')?.value;
    const campaignName = this.scheduleForm.get('campaignName')?.value;
    const sendDate = this.scheduleForm.get('sendDate')?.value?.utc();
    const sendTime = this.scheduleForm.get('sendTime')?.value?.utc();
    const intervalTime = this.scheduleForm.get('interval')?.value;
    const totalCount = this.scheduleForm.get('totalCount')?.value;
    const projectId = this.store.projectId();
    const useremail = this.store.useremail();

    if (
      sourceTemplateId &&
      sourceListId &&
      batchSize &&
      campaignName &&
      sendDate &&
      sendTime &&
      intervalTime &&
      totalCount &&
      projectId &&
      useremail
    ) {
      this.spinnerService.show();

      const h = sendTime.get('hour');
      const m = sendTime.get('minute');
      sendDate.set('hour', h);
      sendDate.set('minute', m);

      const campaignCreate: CampaignCreate = {
        id: 0,
        campaignCount: Math.ceil(totalCount / batchSize),
        name: campaignName,
        tags: [],
        projectId,
        createdBy: useremail,
      };

      this.databaseService
        .createCampaign(campaignCreate)
        .pipe(
          switchMap((campaign) =>
            this.iterableService.createBlast({
              batchSize,
              intervalTime,
              listNameFormat: `${campaignName} Blast List {0}`,
              listDescriptionFormat: `Blast List {0}`,
              sourceListId,
              sendAt: sendDate.format('YYYY-MM-DD HH:mm:ss'),
              sourceTemplateId,
              sourceSupressionList,
              campaign: {
                ...campaignCreate,
                id: campaign.id,
              },
            })
          )
        )
        .subscribe(() => {
          this.spinnerService.hide();
          this.router.navigate(['/campaigns']);
        });
    }
  }
}
