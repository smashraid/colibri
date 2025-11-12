import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
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
    MatProgressBarModule,
    MatIconModule,
    MatCardModule,
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
export class Wizard {
  @ViewChild('stepper') stepper!: MatStepper;

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

  constructor(private fb: FormBuilder) {}

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
}
