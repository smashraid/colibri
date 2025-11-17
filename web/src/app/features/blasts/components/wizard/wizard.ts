import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  Signal,
  signal,
  viewChild,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { AsyncPipe, DatePipe, JsonPipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import {
  STEPPER_GLOBAL_OPTIONS,
  StepperSelectionEvent,
} from '@angular/cdk/stepper';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  createTemplateForm,
  resetTemplateForm,
  TemplateFormControls,
  TemplateFormValue,
} from '../../forms/template-form';
import {
  BatchScalingFormValue,
  createBatchScalingForm,
  resetBatchScalingForm,
  updateBatchScalingValidation,
} from '../../forms/batch-scaling-form';
import {
  createScheduleForm,
  resetScheduleForm,
  ScheduleFormControls,
  ScheduleFormValue,
} from '../../forms/schedule-form';
import { IterableService } from '../../../../core/services/iterable.service';
import { DatabaseService } from '../../../../core/services/database.service';
import { SpinnerService } from '../../../../core/services/spinner.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  Observable,
  startWith,
  tap,
} from 'rxjs';
import { TemplateDetailResponse } from '../../../../core/models/api/response/template';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { CampaignListResponse } from '../../../../core/models/api/response/campaign-list';
import { AppStore } from '../../../../app.store';
import { MatChipGrid } from '@angular/material/chips';
import { CreateBlastRequest } from '../../models/create-blast';
import {
  formatISO,
  getHours,
  getMinutes,
  getSeconds,
  setHours,
  setMinutes,
  setSeconds,
} from 'date-fns';
import { TimeFormatDirective } from '../../../../shared/directives/time-format.directive';
import { timeFormatToMinutes } from '../../../../shared/validators/timeFormat';

interface WizardStep {
  label: string;
  stepName: string; // Used for currentStepTitle()
  completed: boolean;
}

@Component({
  selector: 'app-wizard',
  imports: [
    MatButtonModule,
    MatStepperModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatAutocompleteModule,
    MatProgressBarModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatTimepickerModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    AsyncPipe,
    JsonPipe,
    DatePipe,
    TimeFormatDirective,
  ],
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { displayDefaultIndicatorType: false },
    },
  ],
  templateUrl: './wizard.html',
  styleUrl: './wizard.scss',
})
export class Wizard implements OnInit, AfterViewInit {
  stepper = viewChild.required<MatStepper>('stepper');
  chipGrid = viewChild.required<MatChipGrid>('chipGrid');

  private iterableService = inject(IterableService);
  private databaseService = inject(DatabaseService);
  private spinnerService = inject(SpinnerService);
  private sanitizer = inject(DomSanitizer);
  private announcer = inject(LiveAnnouncer);
  private destroyRef = inject(DestroyRef);
  readonly store = inject(AppStore);

  isLinear = true;
  currentStep = signal(0);

  readonly steps: WritableSignal<WizardStep[]> = signal([
    { label: 'Template', stepName: 'Template & List', completed: false },
    { label: 'Batch Scaling', stepName: 'Batch Scaling', completed: false },
    { label: 'Schedule', stepName: 'Schedule', completed: false },
    { label: 'Review', stepName: 'Review', completed: false },
    { label: 'Confirmation', stepName: 'Confirmation', completed: false },
  ]);

  readonly batchOptions = [
    {
      name: 'Fixed Batch Size',
      value: 1,
    },
    {
      name: 'Growth Percentage',
      value: 2,
    },
  ];

  progressValue: WritableSignal<number> = signal(0);

  // Current step index from stepper (used for display)
  currentStepIndex: WritableSignal<number> = signal(0);

  // Computed property for the step display (1-based)
  currentStepNumber: Signal<number> = computed(
    () => this.currentStepIndex() + 1
  );

  // Computed property for the title display
  currentStepTitle: Signal<string> = computed(
    () => this.steps()[this.currentStepIndex()].stepName
  );

  // Form groups
  templateForm = createTemplateForm();
  batchScalingForm = createBatchScalingForm();
  scheduleForm = createScheduleForm();

  readonly templateFormControls: TemplateFormControls =
    this.templateForm.controls;
  readonly batchScalingFormControls = this.batchScalingForm.controls;
  readonly scheduleFormControls: ScheduleFormControls =
    this.scheduleForm.controls;

  readonly allTags: WritableSignal<string[]> = signal([]);
  readonly filteredTags: WritableSignal<string[]> = signal([]);
  tagKeywords: WritableSignal<string[]> = signal([]);
  readonly separatorKeysCodes: number[] = [ENTER];

  templateInfoValidated: WritableSignal<boolean> = signal(false);

  templateListInfo$:
    | Observable<{ template: TemplateDetailResponse; size: bigint }>
    | undefined;
  previewHtml = signal<SafeHtml | string>('');
  previewUrl = signal<string>('');

  iterableCampaignList = toSignal(
    this.iterableService.getListByType('Blast List'),
    { initialValue: [] }
  );

  readonly sendAt: Signal<string | null> = computed(() => {
    const date = this.scheduleFormControls.sendAtDate.value;
    const time = this.scheduleFormControls.sendAtTime.value;

    if (date && time) {
      let combinedDate = new Date(date);
      combinedDate = setHours(combinedDate, getHours(time));
      combinedDate = setMinutes(combinedDate, getMinutes(time));
      combinedDate = setSeconds(combinedDate, getSeconds(time));
      return combinedDate.toISOString();
    }

    return null;
  });

  private iterableListIdValueChanges = toSignal(
    this.templateFormControls.iterableListId.valueChanges.pipe(
      startWith(this.templateFormControls.iterableListId.value),
      map((value) => {
        if (typeof value === 'string') return value;
        if (value && typeof value === 'object') return value.name;
        return '';
      })
    )
  );

  filteredIterableCampaignList = computed(() => {
    const filter = this.iterableListIdValueChanges()?.toLowerCase() || '';
    const lists = this.iterableCampaignList();

    if (
      !filter ||
      typeof this.templateFormControls.iterableListId.value !== 'string'
    ) {
      return lists;
    }

    return lists.filter((list) => list.name.toLowerCase().includes(filter));
  });

  onListOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const selectedList = event.option.value as CampaignListResponse;
    this.templateFormControls.iterableListId.setValue(selectedList, {
      emitEvent: true,
    });
  }

  displayIterableCampaignListFn(list: CampaignListResponse | null): string {
    return list && list.name ? list.name : '';
  }

  submitForm(): void {
    const sendAtDateTimeString = this.sendAt();

    if (
      this.templateForm.invalid ||
      this.batchScalingForm.invalid ||
      this.scheduleForm.invalid ||
      !sendAtDateTimeString
    ) {
      console.error('Cannot submit: Missing form data or template/list IDs.');
      return;
    }

    const templateValues: TemplateFormValue = this.templateForm.getRawValue();
    const batchScalingValues: BatchScalingFormValue =
      this.batchScalingForm.getRawValue();
    const scheduleValues: ScheduleFormValue = this.scheduleForm.getRawValue();

    const request: CreateBlastRequest = {
      projectId: this.store.projectId(),
      name: scheduleValues.name,
      tags: scheduleValues.tags,
      batchSize: batchScalingValues.batchSize,
      initialListSize: batchScalingValues.initialListSize,
      growthPercentage: batchScalingValues.growthPercentage,
      batchType: batchScalingValues.batchType!,
      intervalTime: timeFormatToMinutes(scheduleValues.intervalTime!),
      listNameFormat: `${scheduleValues.name} Blast List {0}`,
      listDescriptionFormat: `Blast List {0}`,
      iterableListId: templateValues.iterableListId?.id ?? BigInt(0),
      iterableTemplateId: templateValues.iterableTemplateId ?? BigInt(0),
      iterableSupressionId: templateValues.iterableSupressionId,
      sendAt: sendAtDateTimeString,
      status: 0,
      createdBy: this.store.useremail(),
      createdDate: new Date().toISOString(),
    };

    console.log('Final Payload:', request);

    this.stepper().next();
    this.store.startLoading();

    this.databaseService
      .postBlast(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (id) => {
          console.log('postBlast', id);
          this.stepper().next();
        },
        error: (err) => {
          this.store.stopLoading();
        },
        complete: () => this.store.stopLoading(),
      });
  }

  resetStepper() {
    this.stepper().reset();
    resetTemplateForm(this.templateForm);
    resetBatchScalingForm(this.batchScalingForm);
    resetScheduleForm(this.scheduleForm);
    this.templateInfoValidated.set(false);
    this.progressValue.set(0);
    this.steps.set(this.steps().map((s) => ({ ...s, completed: false })));
  }

  sanitizedHtml(htmlString: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(htmlString);
  }

  sanitizedUrl(htmlString: string): string {
    return URL.createObjectURL(new Blob([htmlString], { type: 'text/html' }));
  }

  getTemplateListInfo(): void {
    const templateId = this.templateFormControls.iterableTemplateId.value;
    const listId = this.templateFormControls.iterableListId.value;

    if (templateId && listId) {
      const requests = forkJoin({
        template: this.iterableService.getTemplateById(templateId),
        size: this.iterableService.getListSize(listId.id),
      });

      this.templateListInfo$ = requests.pipe(
        tap(({ template, size }) => {
          this.previewHtml.set(this.sanitizedHtml(template.html));
          this.previewUrl.set(this.sanitizedUrl(template.html));

          this.scheduleForm.patchValue({
            name: template.name,
          });

          this.templateInfoValidated.set(true);

          //this.stepper().next();
        })
      );
    } else {
      this.previewUrl.set('');
      this.previewHtml.set('');
      console.error('Template or List ID is missing or invalid.');
      this.templateInfoValidated.set(false);
    }
  }

  removeTag(keyword: string) {
    this.tagKeywords.update((keywords) => {
      const index = keywords.indexOf(keyword);
      if (index < 0) {
        return keywords;
      }
      keywords.splice(index, 1);
      this.announcer.announce(`removed ${keyword} from reactive form`);
      this.scheduleFormControls.tags.setValue([...keywords]);
      return [...keywords];
    });

    if (this.allTags().includes(keyword)) {
      this.filteredTags.update((prev) => [...prev, keyword].sort());
    }
  }

  addTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim().toUpperCase();

    if (value) {
      const currentTags = this.tagKeywords();

      if (!currentTags.includes(value)) {
        // 1. If the tag is NOT in the database (this.allTags()), add it to allTags
        // This simulates adding a new tag to the database before adding it to the form
        if (!this.allTags().includes(value)) {
          this.allTags.update((prev) => [...prev, value].sort());
          // IMPORTANT: Re-filter immediately after adding a new tag to allTags
          this.filterTags(this.scheduleFormControls.tags.value || []);
          console.log(
            `New Tag Added: ${value}. Total unique tags: ${
              this.allTags().length
            }`
          );
        }

        // 2. Add the tag to the selected chips (tagKeywords)
        this.tagKeywords.update((keywords) => [...keywords, value]);
        this.announcer.announce(`added ${value} to reactive form`);

        // 3. Update the form control
        this.scheduleFormControls.tags.setValue(this.tagKeywords());

        // 4. Remove the added tag from the autocomplete list (filteredTags)
        this.filteredTags.update((prev) => prev.filter((tag) => tag !== value));
      }
    }

    // Clear the input value
    event.chipInput!.clear();
  }

  onSelectedTag(event: MatAutocompleteSelectedEvent): void {
    const value = event.option.viewValue.toUpperCase();
    const currentTags = this.tagKeywords();

    if (value && !currentTags.includes(value)) {
      this.tagKeywords.update((keywords) => [...keywords, value]);
      this.announcer.announce(`added ${value} to reactive form`);
      this.scheduleFormControls.tags.setValue(this.tagKeywords());
      this.filteredTags.update((prev) => prev.filter((tag) => tag !== value));
    }
  }

  // Filtering function for the autocomplete input
  filterTags(value: string | string[]): void {
    const filterValue = (typeof value === 'string' ? value : '').toLowerCase();
    const selectedTags = this.scheduleFormControls.tags.value || [];

    this.filteredTags.set(
      this.allTags()
        .filter(
          (tag) =>
            tag.toLowerCase().includes(filterValue) &&
            !selectedTags.includes(tag.toUpperCase()) // Exclude already selected tags
        )
        .sort()
    );
  }

  ngOnInit(): void {
    this.databaseService
      .getTags()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tags) => {
        this.allTags.set(tags);
        this.filteredTags.set(tags);
      });

    this.databaseService
      .getTags()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tags) => {
        this.allTags.set(tags);
        this.filteredTags.set(tags);
      });

    // this.scheduleForm.valueChanges.subscribe((value) => {
    //   this.formDataJson = JSON.stringify(value, null, 2); // null, 2 for pretty printing
    // });
  }

  ngAfterViewInit(): void {
    // 1. Initial setup based on the default value (which is now 1 in the form file)
    updateBatchScalingValidation(this.batchScalingForm); // <-- INITIAL CALL

    // 2. Subscribe to changes and use takeUntilDestroyed()
    this.batchScalingFormControls.batchType.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        startWith(this.batchScalingFormControls.batchType.value)
      )
      .subscribe(() => {
        updateBatchScalingValidation(this.batchScalingForm);
      });

    this.stepper()
      .selectionChange.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: StepperSelectionEvent) => {
        this.currentStepIndex.set(event.selectedIndex);

        const primaryStepsCount = this.steps().length;
        const progressStepIndex = event.selectedIndex + 1;

        let newProgress = 0;
        if (progressStepIndex <= primaryStepsCount) {
          newProgress = (progressStepIndex / primaryStepsCount) * 100;
        } else {
          newProgress = 100;
        }

        this.progressValue.set(newProgress);
      });
  }
}
