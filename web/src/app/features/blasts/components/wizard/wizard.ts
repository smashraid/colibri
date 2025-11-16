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
import { AsyncPipe, JsonPipe } from '@angular/common';
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
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  createTemplateForm,
  resetTemplateForm,
  TemplateFormControls,
} from '../../forms/template-form';
import {
  createBatchScalingForm,
  resetBatchScalingForm,
  updateBatchScalingValidation,
} from '../../forms/batch-scaling-form';
import {
  createScheduleForm,
  resetScheduleForm,
  ScheduleFormControls,
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
  setHours,
  setMinutes,
  setSeconds,
} from 'date-fns';

interface Step {
  label: string;
  completed: boolean;
  form: any;
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
  // @ViewChild() stepper!: MatStepper;
  // @ViewChild() chipGrid!: MatChipGrid;
  stepper = viewChild<MatStepper>('stepper');
  chipGrid = viewChild<MatChipGrid>('chipGrid');

  private iterableService = inject(IterableService);
  private databaseService = inject(DatabaseService);
  private spinnerService = inject(SpinnerService);
  private sanitizer = inject(DomSanitizer);
  private announcer = inject(LiveAnnouncer);
  private destroyRef = inject(DestroyRef);
  readonly store = inject(AppStore);

  isLinear = true;
  currentStep = signal(0);
  formDataJson: string = '';

  // Steps configuration
  steps: WritableSignal<Step[]> = signal([
    { label: 'Template Information', completed: false, form: 'templateForm' },
    { label: 'Batch Scaling', completed: false, form: 'batchScalingForm' },
    { label: 'Schedule', completed: false, form: 'scheduleForm' },
    { label: 'Review', completed: false, form: 'review' },
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

  currentStepTitle = computed(() => this.steps()[this.currentStep()].label);
  currentStepNumber = computed(() => this.currentStep() + 1);
  progressValue = computed(
    () => (this.currentStep() / (this.steps().length - 1)) * 100
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

  templateListInfo$:
    | Observable<{ template: TemplateDetailResponse; size: bigint }>
    | undefined;
  previewHtml = signal<SafeHtml | string>('');
  previewUrl = signal<string>('');

  iterableCampaignList = toSignal(
    this.iterableService.getListByType('Blast List'),
    { initialValue: [] }
  );

  private iterableListIdValueChanges = toSignal(
    this.templateFormControls.iterableListId.valueChanges.pipe(
      startWith(this.templateFormControls.iterableListId.value),
      // 💡 Map the value to the string name for filtering, or keep it as null/object
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

    // 🟢 Set the value to the full OBJECT. The form control now holds the correct object type.
    this.templateFormControls.iterableListId.setValue(selectedList, {
      emitEvent: true,
    });
  }

  // Your existing displayFn, which works for the object:
  displayIterableCampaignListFn(list: CampaignListResponse | null): string {
    return list && list.name ? list.name : '';
  }

  submitForm(): void {
    const templateData = this.templateForm.getRawValue();
    const batchData = this.batchScalingForm.getRawValue();
    const scheduleData = this.scheduleForm.getRawValue();

    // Basic validation check
    if (
      !templateData ||
      !batchData ||
      !scheduleData ||
      scheduleData.sendAtDate ||
      scheduleData.sendAtTime
    ) {
      console.error('Cannot submit: Missing form data or template/list IDs.');
      return;
    }

    if (scheduleData.sendAtDate && scheduleData.sendAtTime) {
      const hours = getHours(scheduleData.sendAtTime);
      const minutes = getMinutes(scheduleData.sendAtTime);
      let combinedDate = setHours(scheduleData.sendAtDate, hours);
      combinedDate = setMinutes(combinedDate, minutes);
      combinedDate = setSeconds(combinedDate, 0);

      const sendAtISOString = formatISO(combinedDate);

      // Combine date and time to create the ISO 8601 string for 'sendAt'

      const payload: CreateBlastRequest = {
        projectId: 1, // Placeholder value
        name: scheduleData.name,
        tags: scheduleData.tags,
        batchSize: batchData.batchSize,
        initialListSize: batchData.initialListSize,
        growthPercentage: batchData.growthPercentage,
        batchType: batchData.batchType!,
        intervalTime: scheduleData.intervalTime!,
        listNameFormat: `${scheduleData.name} Blast List {0}`,
        listDescriptionFormat: `Blast List {0}`,
        iterableListId: templateData.iterableListId?.id ?? BigInt(0),
        iterableTemplateId: templateData.iterableTemplateId ?? BigInt(0),
        iterableSupressionId: templateData.iterableSupressionId,
        sendAt: sendAtISOString,
        status: 0, // Placeholder value
        createdBy: 'User', // Placeholder value
        createdDate: '', //scheduleData.sendAtDate + scheduleData.sendAtTime,
      };

      console.log('Final Payload:', payload);
      this.store.startLoading();
    }
    // Call the service to create the blast
    // this.iterableService
    //   .createBlast(payload)
    //   .pipe(
    //     tapResponse({
    //       next: (response) => {
    //         console.log('Blast created successfully:', response);
    //         this.lastSubmitError.set(null);
    //         this.steps.update((steps) =>
    //           steps.map((step, index) => ({
    //             ...step,
    //             completed:
    //               index === this.stepper.selectedIndex ? true : step.completed,
    //           }))
    //         );
    //         this.stepper.next(); // Go to Confirmation step
    //       },
    //       error: (error) => {
    //         console.error('Blast creation failed:', error);
    //         this.lastSubmitError.set(
    //           'Failed to create blast. Please check the console for details.'
    //         );
    //       },
    //     }),
    //     take(1),
    //     finalize(() => this.isLoading.set(false)),
    //     takeUntilDestroyed(this.destroyRef)
    //   )
    //   .subscribe();
  }

  resetStepper(): void {
    this.stepper()?.reset();
    resetTemplateForm(this.templateForm);
    resetBatchScalingForm(this.batchScalingForm);
    resetScheduleForm(this.scheduleForm);
    this.steps.update((prev) =>
      prev.map((step) => {
        return {
          ...step,
          completed: !step.completed,
        };
      })
    );
    //this.templateListInfo$.set(null);
    this.previewHtml.set('');
    this.previewUrl.set('');
  }

  sanitizedHtml(htmlString: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(htmlString);
  }

  sanitizedUrl(htmlString: string): string {
    return URL.createObjectURL(new Blob([htmlString], { type: 'text/html' }));
  }

  private getNumericListId(value: CampaignListResponse | null): bigint | null {
    // If the control holds a valid object, return its ID
    return value && typeof value === 'object' ? BigInt(value.id) : null;
  }

  getTemplateListInfo(): void {
    const templateId = this.templateFormControls.iterableTemplateId.value;
    const listObject = this.templateFormControls.iterableListId.value;
    const listId = this.getNumericListId(listObject);

    if (templateId && listId) {
      // 1. Combine the two API calls with forkJoin
      const requests = forkJoin({
        template: this.iterableService.getTemplateById(templateId),
        size: this.iterableService.getListSize(listId),
      });

      // 2. Subscribe to the combined result and perform all side effects in a single stream
      this.templateListInfo$ = requests.pipe(
        // Using 'tap' is cleaner for side effects like updating state/form
        tap(({ template, size }) => {
          // A. Update the local signal/state for the preview
          this.previewHtml.set(this.sanitizedHtml(template.html));
          this.previewUrl.set(this.sanitizedUrl(template.html));

          // B. Patch the form with data from both results
          // this.templateForm.patchValue({
          //   campaignName: template.name, // From the template result
          //   totalCount: size, // From the list size result
          // });
        })
        // 3. (Optional) If you need to map or return the result for further chaining
        // map(({ template, size }) => ({ template, size }))
      );

      // 4. (Required if you only used forkJoin to update state and need to kick off the subscription)
      // If you need to actually subscribe and fetch the data immediately, you need to subscribe.
      // If you bind 'this.templateListInfo$' in the template with the 'async' pipe,
      // you don't need the explicit subscribe().
      // If you subscribe, remember to manage the subscription to prevent memory leaks.

      /* Example if you need an immediate subscription:
    this.templateListInfo$.subscribe({
      next: (data) => console.log('Info fetched:', data),
      error: (err) => console.error('Fetch failed', err)
    });
    */
    } else {
      // Optional: handle the case where IDs are missing, e.g., clear state/form values
      // this.preview.set('');
    }
  }

  removeTag(keyword: string) {
    // 1. Remove the tag from the form control and the local chip display list
    this.tagKeywords.update((keywords) => {
      const index = keywords.indexOf(keyword);
      if (index < 0) {
        return keywords;
      }
      keywords.splice(index, 1);
      this.announcer.announce(`removed ${keyword} from reactive form`);
      // Update the form control manually since we are using signals for the chips
      this.scheduleFormControls.tags.setValue([...keywords]);
      return [...keywords];
    });

    // 2. Restore the tag to the filteredTags list (if it is an existing, non-deleted tag)
    if (this.allTags().includes(keyword)) {
      this.filteredTags.update((prev) => [...prev, keyword].sort());
    }
  }

  // When ENTER or COMMA is pressed
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

  // When an option is selected from the autocomplete dropdown
  onSelectedTag(event: MatAutocompleteSelectedEvent): void {
    const value = event.option.viewValue.toUpperCase();
    const currentTags = this.tagKeywords();

    if (value && !currentTags.includes(value)) {
      // 1. Add the selected tag to the chips list (tagKeywords)
      this.tagKeywords.update((keywords) => [...keywords, value]);
      this.announcer.announce(`added ${value} to reactive form`);

      // 2. Update the form control
      this.scheduleFormControls.tags.setValue(this.tagKeywords());

      // 3. Remove the selected tag from the autocomplete list (filteredTags)
      this.filteredTags.update((prev) => prev.filter((tag) => tag !== value));
    }
    // Clear the input value is handled in the template: currentTag.value = ''
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

    this.scheduleForm.valueChanges.subscribe((value) => {
      this.formDataJson = JSON.stringify(value, null, 2); // null, 2 for pretty printing
    });
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

    // 3. Listen to stepper selection change
    this.stepper()
      ?.selectionChange.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        this.currentStep.set(event.selectedIndex);
      });
  }
}
