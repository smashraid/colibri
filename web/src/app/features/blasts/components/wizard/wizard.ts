import {
  Component,
  computed,
  inject,
  OnInit,
  Signal,
  signal,
  ViewChild,
} from '@angular/core';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import {
  createTemplateForm,
  resetTemplateForm,
} from '../../forms/template-form';
import {
  createBatchScalingForm,
  resetBatchScalingForm,
} from '../../forms/batch-scaling-form';
import {
  createScheduleForm,
  resetScheduleForm,
} from '../../forms/schedule-form';
import { IterableService } from '../../../../core/services/iterable.service';
import { DatabaseService } from '../../../../core/services/database.service';
import { SpinnerService } from '../../../../core/services/spinner.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { forkJoin, map, Observable, startWith, tap } from 'rxjs';
import { TemplateDetailResponse } from '../../../../core/models/api/response/template';
import { toSignal } from '@angular/core/rxjs-interop';
import { CampaignListResponse } from '../../../../core/models/api/response/campaign-list';

interface Step {
  label: string;
  completed: boolean;
  optional?: boolean;
  icon: string;
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
    MatAutocompleteModule,
    MatProgressBarModule,
    MatIconModule,
    MatCardModule,
    AsyncPipe,
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
export class Wizard implements OnInit {
  @ViewChild('stepper') stepper!: MatStepper;

  private iterableService = inject(IterableService);
  private databaseService = inject(DatabaseService);
  private spinnerService = inject(SpinnerService);
  private sanitizer = inject(DomSanitizer);
  private announcer = inject(LiveAnnouncer);

  isLinear = true;

  // Steps configuration
  steps: Step[] = [
    { label: 'Template Info', completed: false, icon: 'counter_1' },
    { label: 'Batch Scaling', completed: false, icon: 'counter_2' },
    { label: 'Schedule', completed: false, icon: 'counter_3' },
    { label: 'Review', completed: false, icon: 'counter_4' },
    { label: 'Confirmation', completed: false, icon: 'counter_5' },
  ];

  // Form groups
  templateForm = createTemplateForm();
  batchScalingForm = createBatchScalingForm();
  scheduleForm = createScheduleForm();

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

  get templateFormControls() {
    return this.templateForm.controls;
  }

  get currentStepIndex(): number {
    return this.stepper?.selectedIndex || 0;
  }

  get currentStepNumber(): number {
    return this.currentStepIndex + 1;
  }

  get currentStepTitle(): string {
    return this.steps[this.currentStepIndex]?.label || '';
  }

  get progressValue(): number {
    const totalSteps = this.steps.length;
    const completedSteps = this.steps.filter((step) => step.completed).length;
    return (completedSteps / totalSteps) * 100;
  }

  nextStep(): void {
    // Mark current step as completed
    if (this.currentStepIndex < this.steps.length) {
      this.steps[this.currentStepIndex].completed = true;
    }

    this.stepper.next();
  }

  previousStep(): void {
    this.stepper.previous();
  }

  goToStep(index: number): void {
    // Only allow navigation to completed steps or the next logical step
    if (index <= this.currentStepIndex || this.steps[index - 1]?.completed) {
      this.stepper.selectedIndex = index;
    }
  }

  submitForm(): void {
    // Mark review step as completed
    this.steps[3].completed = true;

    // Simulate form submission

    // Mark confirmation step as completed
    setTimeout(() => {
      // Move to confirmation step
      this.steps[4].completed = true;
      this.nextStep();
    }, 500);
  }

  resetStepper(): void {
    this.stepper.reset();

    // Reset all steps
    this.steps.forEach((step) => (step.completed = false));

    // Reset forms
    resetTemplateForm(this.templateForm);
    resetBatchScalingForm(this.batchScalingForm);
    resetScheduleForm(this.scheduleForm);
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

  ngOnInit(): void {}
}
